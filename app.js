import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import roomRoutes from './routes/roomRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';

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
    .then(() => console.log('🟢 Kết nối MongoDB (hotel_management) thành công!'))
    .catch((err) => console.error('🔴 Lỗi kết nối MongoDB:', err));

// ==========================================
// ROUTES SẼ GẮN Ở ĐÂY (Bước tiếp theo)
// ==========================================
app.use('/api/rooms', roomRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/bookings', bookingRoutes);

app.get('/', (req, res) => {
    res.send('API Quản lý Khách sạn đang hoạt động!');
});

// ==========================================
// KHỞI ĐỘNG SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});