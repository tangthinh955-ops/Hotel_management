import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        trim: true
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true // Tự động chuyển email về chữ thường
    },
    phone: { 
        type: String, 
        required: true 
    }
}, { timestamps: true });

export default mongoose.model('Customer', customerSchema);