const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    // Tự động kiểm tra xem đang ở trang nào để load dữ liệu
    if (document.getElementById('stats-container')) loadStats();
    if (document.getElementById('room-table-body')) loadRooms();
    if (document.getElementById('customer-table-body')) loadCustomers();
    if (document.getElementById('booking-table-body')) {
        loadBookings();
        prepareBookingForm(); // Load danh sách phòng/khách vào Select
    }
});

// --- LOGIC TRANG CHỦ (STATS) ---
async function loadStats() {
    const rooms = await fetch(`${API_URL}/rooms/all`).then(res => res.json());
    const customers = await fetch(`${API_URL}/customers/all`).then(res => res.json());
    const bookings = await fetch(`${API_URL}/bookings/all`).then(res => res.json());

    document.getElementById('total-rooms').innerText = rooms.length;
    document.getElementById('total-customers').innerText = customers.length;
    document.getElementById('active-bookings').innerText = bookings.length;
}

// --- LOGIC PHÒNG (ROOMS) ---
async function loadRooms() {
    const data = await fetch(`${API_URL}/rooms/all`).then(res => res.json());
    const tbody = document.getElementById('room-table-body');
    tbody.innerHTML = data.map(r => `
        <tr class="tr-hover">
            <td class="td-cell">${r.roomNumber}</td>
            <td class="td-cell">${r.type}</td>
            <td class="td-cell">${r.price.toLocaleString()} VNĐ</td>
            <td class="td-cell"><span class="${r.status === 'Available' ? 'badge-success' : 'badge-danger'}">${r.status}</span></td>
            <td class="td-cell"><button class="btn-danger-outline" onclick="deleteItem('rooms', '${r._id}')">Xóa</button></td>
        </tr>
    `).join('');
}

async function addRoom(event) {
    event.preventDefault();
    const payload = {
        roomNumber: document.getElementById('roomNumber').value,
        type: document.getElementById('type').value,
        price: document.getElementById('price').value
    };
    const res = await fetch(`${API_URL}/rooms/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        location.reload();
    } else {
        const errData = await res.json();
        alert(`Thất bại: ${errData.message}\nChi tiết: ${errData.error}`);
    }
}

// --- LOGIC KHÁCH HÀNG (CUSTOMERS) ---
async function loadCustomers() {
    const data = await fetch(`${API_URL}/customers/all`).then(res => res.json());
    const tbody = document.getElementById('customer-table-body');
    tbody.innerHTML = data.map(c => `
        <tr class="tr-hover">
            <td class="td-cell">${c.name}</td>
            <td class="td-cell">${c.email}</td>
            <td class="td-cell">${c.phone}</td>
            <td class="td-cell"><button class="btn-danger-outline" onclick="deleteItem('customers', '${c._id}')">Xóa</button></td>
        </tr>
    `).join('');
}

async function addCustomer(event) {
    event.preventDefault();
    const payload = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value
    };
    const res = await fetch(`${API_URL}/customers/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        location.reload();
    } else {
        const errData = await res.json();
        alert(`Thất bại: ${errData.message}\nChi tiết: ${errData.error}`);
    }
}

// --- LOGIC ĐẶT PHÒNG (BOOKINGS) ---
async function loadBookings() {
    const data = await fetch(`${API_URL}/bookings/all`).then(res => res.json());
    const tbody = document.getElementById('booking-table-body');
    tbody.innerHTML = data.map(b => `
        <tr class="tr-hover">
            <td class="td-cell">${b.roomId?.roomNumber || 'N/A'}</td>
            <td class="td-cell">${b.customerId?.name || 'N/A'}</td>
            <td class="td-cell">${new Date(b.checkInDate).toLocaleDateString()}</td>
            <td class="td-cell">${new Date(b.checkOutDate).toLocaleDateString()}</td>
            <td class="td-cell"><button class="btn-danger" onclick="deleteItem('bookings', '${b._id}')">Hủy Đặt</button></td>
        </tr>
    `).join('');
}

async function prepareBookingForm() {
    const rooms = await fetch(`${API_URL}/rooms/all`).then(res => res.json());
    const customers = await fetch(`${API_URL}/customers/all`).then(res => res.json());

    // Chỉ hiện phòng Available
    const roomSelect = document.getElementById('roomId');
    roomSelect.innerHTML = rooms.filter(r => r.status === 'Available')
        .map(r => `<option value="${r._id}">Phòng ${r.roomNumber} (${r.type})</option>`).join('');

    const custSelect = document.getElementById('customerId');
    custSelect.innerHTML = customers.map(c => `<option value="${c._id}">${c.name}</option>`).join('');

    // Thiết lập giới hạn chọn ngày trên giao diện
    const checkInInput = document.getElementById('checkInDate');
    const checkOutInput = document.getElementById('checkOutDate');
    
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    checkInInput.min = todayStr; // Vô hiệu hóa các ngày quá khứ trong lịch
    
    // Tự động cập nhật min của checkOutDate khi checkInDate thay đổi
    checkInInput.addEventListener('change', () => {
        if (checkInInput.value) {
            const checkInDate = new Date(checkInInput.value);
            checkInDate.setDate(checkInDate.getDate() + 1); // Cộng thêm 1 ngày
            checkOutInput.min = `${checkInDate.getFullYear()}-${String(checkInDate.getMonth() + 1).padStart(2, '0')}-${String(checkInDate.getDate()).padStart(2, '0')}`;
        }
    });
}

async function createBooking(event) {
    event.preventDefault();
    
    const checkInValue = document.getElementById('checkInDate').value;
    const checkOutValue = document.getElementById('checkOutDate').value;

    if (!checkInValue || !checkOutValue) {
        alert("Lỗi: Vui lòng chọn đầy đủ ngày nhận và ngày trả phòng!");
        return; // Dừng không cho chạy tiếp lệnh tạo form
    }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    if (checkInValue < todayStr) {
        alert("Lỗi: Ngày nhận phòng không được ở trong quá khứ!");
        return; 
    }

    if (checkOutValue <= checkInValue) {
        alert("Lỗi: Ngày trả phòng phải lớn hơn ngày nhận phòng ít nhất 1 ngày!");
        return; 
    }

    const payload = {
        roomId: document.getElementById('roomId').value,
        customerId: document.getElementById('customerId').value,
        checkInDate: checkInValue,
        checkOutDate: checkOutValue
    };
    const res = await fetch(`${API_URL}/bookings/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if(res.ok) location.reload(); else alert("Lỗi đặt phòng!");
}

// --- HÀM XÓA CHUNG ---
async function deleteItem(type, id) {
    if (confirm('Bạn có chắc chắn muốn xóa không?')) {
        await fetch(`${API_URL}/${type}/delete/${id}`, { method: 'DELETE' });
        location.reload();
    }
}