import express from 'express';
import Room from '../models/Room.js';

const router = express.Router();

// Lấy danh sách toàn bộ phòng
router.get('/all', async (req, res) => {
    try {
        const rooms = await Room.find();
        res.status(200).json(rooms);
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// Thêm phòng mới
router.post('/create', async (req, res) => {
    try {
        const newRoom = await Room.create(req.body);
        res.status(201).json(newRoom);
    } catch (error) {
        res.status(400).json({ message: "Lỗi thêm phòng (Có thể trùng số phòng)", error: error.message });
    }
});

// Cập nhật thông tin phòng
router.put('/update/:id', async (req, res) => {
    try {
        const updatedRoom = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedRoom) return res.status(404).json({ message: "Không tìm thấy phòng" });
        res.status(200).json(updatedRoom);
    } catch (error) {
        res.status(400).json({ message: "Lỗi cập nhật", error: error.message });
    }
});

// Xóa phòng
router.delete('/delete/:id', async (req, res) => {
    try {
        const deletedRoom = await Room.findByIdAndDelete(req.params.id);
        if (!deletedRoom) return res.status(404).json({ message: "Không tìm thấy phòng" });
        res.status(200).json({ message: "Đã xóa phòng thành công" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi xóa phòng", error: error.message });
    }
});

export default router;