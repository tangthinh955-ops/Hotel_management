import express from 'express';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js'; // Phải Import Room để còn cập nhật trạng thái

const router = express.Router();

// Lấy danh sách đơn đặt (Populate 2 bảng)
router.get('/all', async (req, res) => {
    try {
        // Dùng populate để lấy chi tiết roomId và customerId
        const bookings = await Booking.find()
            .populate('roomId', 'roomNumber type price') // Chỉ lấy mã phòng, loại, giá
            .populate('customerId', 'name phone');       // Chỉ lấy tên, SĐT của khách
        res.status(200).json(bookings);
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// Tạo đơn đặt phòng MỚI
router.post('/create', async (req, res) => {
    try {
        const { roomId, customerId, checkInDate, checkOutDate } = req.body;

        // 1. Kiểm tra xem phòng có tồn tại và đang "Available" không?
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ message: "Không tìm thấy phòng này!" });
        }
        if (room.status === 'Booked') {
            return res.status(400).json({ message: "Lỗi: Phòng này đã có người đặt!" });
        }

        // 2. Nếu phòng trống -> Tạo Booking
        const newBooking = await Booking.create({
            roomId,
            customerId,
            checkInDate,
            checkOutDate
        });

        // 3. Đổi trạng thái phòng thành 'Booked'
        room.status = 'Booked';
        await room.save(); // Lưu lại thay đổi vào bảng Room

        // [THỰC CHIẾN] - Xóa Cache Redis để list phòng tự động cập nhật data mới
        if (req.redisClient && req.redisClient.isReady) {
            try {
                await req.redisClient.del('all_rooms');
            } catch (redisErr) {
                console.log("🔴 Lỗi xóa cache Redis:", redisErr.message);
            }
        }

        // [THỰC CHIẾN] - Bắn sự kiện Socket.io cho tất cả Admin đang online
        if (req.io) {
            req.io.emit('new_booking_alert', { roomNumber: room.roomNumber });
        }

        res.status(201).json({ message: "Đặt phòng thành công!", booking: newBooking });
    } catch (error) {
        res.status(400).json({ message: "Lỗi tạo đơn đặt", error: error.message });
    }
});

// Cập nhật đơn đặt phòng (Đổi phòng, đổi ngày, đổi khách)
router.put('/update/:id', async (req, res) => {
    try {
        const { roomId, customerId, checkInDate, checkOutDate } = req.body;
        
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: "Không tìm thấy đơn đặt phòng" });

        // Nếu người dùng chọn đổi sang một phòng MỚI khác với phòng cũ
        if (roomId && (!booking.roomId || roomId !== booking.roomId.toString())) {
            const newRoom = await Room.findById(roomId);
            if (!newRoom) return res.status(404).json({ message: "Phòng mới không tồn tại" });
            if (newRoom.status === 'Booked') return res.status(400).json({ message: "Phòng mới đã có người đặt!" });

            if (booking.roomId) {
                await Room.findByIdAndUpdate(booking.roomId, { status: 'Available' }); // Trả lại phòng cũ
            }
            newRoom.status = 'Booked'; // Đặt phòng mới
            await newRoom.save();
        }

        // Cập nhật thông tin vào đơn
        const updatedBooking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });

        res.status(200).json({ message: "Cập nhật đơn đặt thành công!", booking: updatedBooking });
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi cập nhật đơn đặt", error: error.message });
    }
});

// Hủy/Xóa đơn đặt phòng
router.delete('/delete/:id', async (req, res) => {
    try {
        // 1. Tìm đơn đặt phòng sắp bị xóa để lấy cái roomId
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: "Không tìm thấy đơn đặt phòng" });
        }
        if (booking.status === 'Canceled') {
            return res.status(400).json({ message: "Đơn đặt phòng này đã bị hủy từ trước!" });
        }

        // 2. Trả lại trạng thái phòng thành 'Available'
        if (booking.roomId) {
            await Room.findByIdAndUpdate(booking.roomId, { status: 'Available' });
        }

        // 3. Đánh dấu đơn là đã hủy (Soft Delete) thay vì xóa hẳn
        booking.status = 'Canceled';
        await booking.save();

        res.status(200).json({ message: "Đã thao tác hủy đơn đặt thành công và trả lại phòng trống!" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi hủy đơn", error: error.message });
    }
});

export default router; 