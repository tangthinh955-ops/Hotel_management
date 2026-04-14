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
async function loadCustomers(searchQuery = '') {
    const data = await fetch(`${API_URL}/customers/all`).then(res => res.json());
    const tbody = document.getElementById('customer-table-body');

    // Lọc dữ liệu nếu có từ khóa tìm kiếm (không phân biệt hoa thường)
    const filteredData = searchQuery 
        ? data.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : data;

    tbody.innerHTML = filteredData.map(c => `
        <tr id="customer-row-${c._id}" class="tr-hover">
            <td class="td-cell">${c.name}</td>
            <td class="td-cell">${c.email}</td>
            <td class="td-cell">${c.phone}</td>
            <td class="td-cell space-x-2">
                <button class="btn-secondary" onclick="viewCustomerHistory('${c._id}')">Lịch Sử</button>
                <button class="btn-danger-outline" onclick="deleteItem('customers', '${c._id}')">Xóa</button>
            </td>
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

function handleSearchCustomer(event) {
    loadCustomers(event.target.value);
}

async function viewCustomerHistory(customerId) {
    try {
        // Nếu box lịch sử đã mở thì đóng nó lại (Tính năng Toggle)
        const existingRow = document.getElementById(`history-row-${customerId}`);
        if (existingRow) {
            existingRow.remove();
            return;
        }

        const bookings = await fetch(`${API_URL}/bookings/all`).then(res => res.json());
        
        // Lọc các đơn đặt phòng thuộc về khách hàng này và sắp xếp mới nhất lên đầu
        const history = bookings
            .filter(b => b.customerId && b.customerId._id === customerId)
            .sort((a, b) => new Date(b.checkInDate) - new Date(a.checkInDate));
        
        if (history.length === 0) {
            alert('Khách hàng này chưa có lịch sử đặt phòng nào.');
            return;
        }

        const historyHtml = history.map((b, index) => {
            const checkInDate = new Date(b.checkInDate);
            const checkOutDate = new Date(b.checkOutDate);
            const checkInStr = checkInDate.toLocaleDateString('vi-VN');
            const checkOutStr = checkOutDate.toLocaleDateString('vi-VN');
            
            const roomName = b.roomId ? `Phòng ${b.roomId.roomNumber} (${b.roomId.type})` : 'Phòng đã bị xóa';
            
            // Tính toán tiền
            const days = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
            const price = b.roomId?.price || 0;
            const total = days > 0 ? days * price : 0;

            return `
                <div class="history-card">
                    <div class="font-bold text-blue-600 text-lg mb-2">${index + 1}. ${roomName}</div>
                    <div class="text-sm text-gray-700">🕒 <strong>Nhận phòng:</strong> ${checkInStr}</div>
                    <div class="text-sm text-gray-700 mt-1">🕒 <strong>Trả phòng:</strong> ${checkOutStr}</div>
                    <div class="text-sm text-green-600 font-bold mt-2 pt-2 border-t border-gray-100">💰 Tổng tiền: ${total.toLocaleString()} VNĐ</div>
                </div>
            `;
        }).join('');

        // Lấy dòng khách hàng hiện tại trên bảng
        const customerRow = document.getElementById(`customer-row-${customerId}`);
        if (!customerRow) return;

        // Tạo một dòng mới chứa Box hiển thị lịch sử
        const historyRow = document.createElement('tr');
        historyRow.id = `history-row-${customerId}`;
        historyRow.className = 'bg-gray-100'; // Đổi màu nền để phân biệt
        historyRow.innerHTML = `
            <td colspan="4" class="p-4 border-b border-gray-200 shadow-inner">
                <div class="flex justify-between items-center mb-3 px-2">
                    <h4 class="font-bold text-gray-700 text-lg">Lịch sử đặt phòng</h4>
                    <button onclick="document.getElementById('history-row-${customerId}').remove()" class="text-red-500 hover:text-red-700 font-bold text-sm">✖ Đóng box</button>
                </div>
                <div class="flex flex-col px-2">${historyHtml}</div>
            </td>
        `;
        
        // Chèn box lịch sử vào ngay bên dưới dòng thông tin của khách hàng
        customerRow.parentNode.insertBefore(historyRow, customerRow.nextSibling);

    } catch (error) {
        alert("Đã xảy ra lỗi khi tải lịch sử đặt phòng.");
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
        .map(r => `<option value="${r._id}" data-price="${r.price}">Phòng ${r.roomNumber} (${r.type} - ${r.price.toLocaleString()}đ/đêm)</option>`).join('');

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
        calculateEstimatedCost(); // Tính toán lại khi đổi ngày nhận
    });

    // Lắng nghe sự kiện để tính tiền khi thay đổi ngày trả hoặc đổi phòng
    checkOutInput.addEventListener('change', calculateEstimatedCost);
    roomSelect.addEventListener('change', calculateEstimatedCost);
}

function calculateEstimatedCost() {
    const roomSelect = document.getElementById('roomId');
    const checkInInput = document.getElementById('checkInDate').value;
    const checkOutInput = document.getElementById('checkOutDate').value;
    const costElement = document.getElementById('estimatedCost');

    // Nếu chưa chọn đủ thông tin, tiền = 0
    if (!roomSelect.value || !checkInInput || !checkOutInput) {
        costElement.innerText = "Tạm tính: 0 VNĐ";
        return;
    }

    const checkIn = new Date(checkInInput);
    const checkOut = new Date(checkOutInput);
    const days = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    if (days > 0) {
        const selectedOption = roomSelect.options[roomSelect.selectedIndex];
        const price = parseFloat(selectedOption.getAttribute('data-price') || 0);
        const total = days * price;
        costElement.innerText = `Tạm tính: ${total.toLocaleString()} VNĐ`;
    } else {
        costElement.innerText = "Tạm tính: 0 VNĐ";
    }
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