import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import roomRoutes from './routes/roomRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import authRoutes from './routes/authRoutes.js';
import User from './models/User.js';
import bcrypt from 'bcryptjs';

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARES
// ==========================================
app.use(cors()); // Mở cổng giao tiếp cho Frontend gọi API
app.use(express.json()); // Dịch dữ liệu gửi lên dưới dạng JSON
app.use(express.static('public'));
// ==========================================
// KẾT NỐI MONGODB
// ==========================================
const MONGO_URI = 'mongodb://127.0.0.1:27017/hotel_management';

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('🟢 Kết nối MongoDB (hotel_management) thành công!');
        await initAdminUser();
    })
    .catch((err) => console.error('🔴 Lỗi kết nối MongoDB:', err));

// Script tự động tạo Admin mẫu
async function initAdminUser() {
    try {
        const count = await User.countDocuments();
        if (count === 0) {
            const hashedPassword = await bcrypt.hash('123456', 10);
            await User.create({ email: 'admin@gmail.com', password: hashedPassword, role: 'admin' });
            console.log('🟢 Đã tạo tài khoản admin mặc định: admin@gmail.com / 123456');
        }
    } catch (error) {
        console.error('🔴 Lỗi tạo tài khoản admin:', error);
    }
}

// ==========================================
// ROUTES SẼ GẮN Ở ĐÂY (Bước tiếp theo)
// ==========================================
app.use('/api/rooms', roomRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
    res.send('API Quản lý Khách sạn đang hoạt động!');
});

// ==========================================
// KHỞI ĐỘNG SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});