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

        res.status(201).json({ message: "Đặt phòng thành công!", booking: newBooking });
    } catch (error) {
        res.status(400).json({ message: "Lỗi tạo đơn đặt", error: error.message });
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

        // 2. Trả lại trạng thái phòng thành 'Available'
        await Room.findByIdAndUpdate(booking.roomId, { status: 'Available' });

        // 3. Xóa đơn đặt phòng
        await Booking.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: "Đã hủy đơn đặt và trả lại phòng trống!" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi hủy đơn", error: error.message });
    }
});

export default router;