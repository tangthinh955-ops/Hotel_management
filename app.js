import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { createClient } from 'redis';
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
// CẤU HÌNH HTTP SERVER, SOCKET.IO VÀ REDIS
// ==========================================
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Khởi tạo Redis Client
const redisClient = createClient(); // Mặc định kết nối tới redis://localhost:6379
redisClient.on('error', (err) => console.log('🔴 Lỗi Redis Client', err));
redisClient.connect().then(() => {
    console.log('🟢 Kết nối Redis Server thành công!');
});

// Lắng nghe kết nối Socket.io từ client
io.on('connection', (socket) => {
    console.log(`⚡ Một client vừa kết nối: ${socket.id}`);
    socket.on('disconnect', () => {
        console.log(`🔴 Client đã ngắt kết nối: ${socket.id}`);
    });
});

// Middleware Inject io và redisClient vào request
app.use((req, res, next) => {
    req.io = io;
    req.redisClient = redisClient;
    next();
});

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
server.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});