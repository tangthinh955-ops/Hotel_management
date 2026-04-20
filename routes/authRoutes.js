import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();
const JWT_SECRET = 'my_super_secret_key_123'; // Nên đặt trong file .env cho dự án thực tế

// Đăng ký tài khoản mới
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Kiểm tra xem email đã tồn tại chưa
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email này đã được sử dụng!' });
        }

        // Mã hóa mật khẩu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Tạo user mới (mặc định cho role là admin để bạn dễ test)
        const newUser = new User({ email, password: hashedPassword, role: 'admin' });
        await newUser.save();

        res.status(201).json({ message: 'Đăng ký thành công!' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Kiểm tra user có tồn tại không
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });
        }

        // So sánh mật khẩu
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });
        }

        // Đăng nhập thành công, tạo token
        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
        res.status(200).json({ token, message: 'Đăng nhập thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

export default router;
