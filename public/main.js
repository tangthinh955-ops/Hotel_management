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
        <tr>
            <td>${r.roomNumber}</td>
            <td>${r.type}</td>
            <td>${r.price.toLocaleString()} VNĐ</td>
            <td><span class="badge ${r.status === 'Available' ? 'bg-success' : 'bg-danger'}">${r.status}</span></td>
            <td><button class="btn btn-sm btn-outline-danger" onclick="deleteItem('rooms', '${r._id}')">Xóa</button></td>
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
        <tr>
            <td>${c.name}</td>
            <td>${c.email}</td>
            <td>${c.phone}</td>
            <td><button class="btn btn-sm btn-outline-danger" onclick="deleteItem('customers', '${c._id}')">Xóa</button></td>
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
        <tr>
            <td>${b.roomId?.roomNumber || 'N/A'}</td>
            <td>${b.customerId?.name || 'N/A'}</td>
            <td>${new Date(b.checkInDate).toLocaleDateString()}</td>
            <td>${new Date(b.checkOutDate).toLocaleDateString()}</td>
            <td><button class="btn btn-sm btn-danger" onclick="deleteItem('bookings', '${b._id}')">Hủy Đặt</button></td>
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
}

async function createBooking(event) {
    event.preventDefault();
    const payload = {
        roomId: document.getElementById('roomId').value,
        customerId: document.getElementById('customerId').value,
        checkInDate: document.getElementById('checkInDate').value,
        checkOutDate: document.getElementById('checkOutDate').value
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