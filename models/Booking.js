import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
    roomId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Room', // Trỏ chính xác vào tên Model 'Room'
        required: true 
    },
    customerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Customer', // Trỏ chính xác vào tên Model 'Customer'
        required: true 
    },
    checkInDate: { 
        type: Date, 
        required: true 
    },
    checkOutDate: { 
        type: Date, 
        required: true 
    },
    status: {
        type: String,
        enum: ['Active', 'Canceled'],
        default: 'Active'
    }
}, { timestamps: true });

export default mongoose.model('Booking', bookingSchema);