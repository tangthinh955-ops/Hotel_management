import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        trim: true,
        match: [/^[a-zA-ZÀ-ỹ\s]+$/, 'Tên không được chứa kí tự lạ, số hoặc emoji']
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true, // Tự động chuyển email về chữ thường
        match: [/^[\w\.-]+@gmail\.com$/, 'Email phải có định dạng @gmail.com']
    },
    phone: { 
        type: String, 
        required: true,
        match: [/^\d+$/, 'Số điện thoại chỉ được chứa chữ số']
    }
}, { timestamps: true });

export default mongoose.model('Customer', customerSchema);