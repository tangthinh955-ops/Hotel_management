import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
    roomNumber: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true, // Tự động xóa khoảng trắng thừa ở hai đầu
        match: [/^[a-zA-Z0-9]+$/, 'Số phòng chỉ được chứa chữ cái và số, không chứa kí tự lạ']
    },
    type: { 
        type: String, 
        enum: ['Single', 'Double', 'Suite'], // Chỉ cho phép nhập 1 trong 3 loại này
        required: true 
    },
    price: { 
        type: Number, 
        required: true,
        min: 0 // Giá không được số âm
    },
    status: { 
        type: String, 
        enum: ['Available', 'Booked'], 
        default: 'Available' // Mặc định khi mới tạo là phòng trống
    }
}, { timestamps: true });

export default mongoose.model('Room', roomSchema);