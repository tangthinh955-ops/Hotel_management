const API_URL = 'http://localhost:3000/api';

// ==========================================
// KIỂM TRA ĐĂNG NHẬP (BẢO VỆ FRONTEND)
// ==========================================
if (!localStorage.getItem('token')) {
    window.location.href = 'login.html';
}

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
let globalBookings = []; // Biến cache dữ liệu để dùng cho bộ lọc biểu đồ

async function loadStats() {
    const rooms = await fetch(`${API_URL}/rooms/all`).then(res => res.json());
    const customers = await fetch(`${API_URL}/customers/all`).then(res => res.json());
    const bookings = await fetch(`${API_URL}/bookings/all`).then(res => res.json());
    globalBookings = bookings; // Lưu lại để dùng khi đổi bộ lọc

    document.getElementById('total-rooms').innerText = rooms.length;
    document.getElementById('total-customers').innerText = customers.length;
    document.getElementById('active-bookings').innerText = bookings.length;

    // Tính tổng doanh thu của tháng hiện tại và gán lên giao diện
    const monthlyChartData = calculateMonthlyRevenue(bookings, 0); // Lấy mảng tiền của các ngày trong tháng này
    const totalMonthlyRevenue = monthlyChartData.data.reduce((sum, val) => sum + val, 0); // Cộng dồn
    document.getElementById('monthly-revenue').innerText = totalMonthlyRevenue.toLocaleString() + 'đ';

    renderCharts(rooms, bookings);
}

let roomChartInstance = null;
let revenueChartInstance = null;

// Hàm Helper: Tính doanh thu 7 ngày qua
function calculate7DaysRevenue(bookings) {
    const labels = [];
    const data = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Đưa về 0h00 để so sánh cho chuẩn

    // Lùi về 7 ngày trước để tạo nhãn và tính doanh thu
    for (let i = 6; i >= 0; i--) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() - i);
        
        // Format DD/MM
        const dd = String(targetDate.getDate()).padStart(2, '0');
        const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
        labels.push(`${dd}/${mm}`);

        // Tính tổng tiền các đơn đặt phòng có Check-in vào ngày này
        let dailyRevenue = 0;
        bookings.forEach(b => {
            if (!b.roomId || !b.checkInDate || !b.checkOutDate) return;
            
            const checkIn = new Date(b.checkInDate);
            checkIn.setHours(0, 0, 0, 0);
            
            if (checkIn.getTime() === targetDate.getTime()) {
                const checkOut = new Date(b.checkOutDate);
                checkOut.setHours(0, 0, 0, 0); // Đưa cả checkOut về 0h để đồng bộ
                const days = Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24)); // Dùng Math.round để an toàn tuyệt đối
                if (days > 0) dailyRevenue += days * (b.roomId.price || 0);
            }
        });
        data.push(dailyRevenue);
    }
    return { labels, data };
}

// Hàm Helper: Tính doanh thu theo từng ngày trong tháng
function calculateMonthlyRevenue(bookings, monthOffset = 0) {
    const labels = [];
    const data = [];
    
    // Sửa lỗi ngầm JS Date: Nếu hôm nay là ngày 31, lùi về 1 tháng (tháng có 30 ngày) sẽ bị lỗi tràn ngày làm sai tháng.
    // Khắc phục: Ép ngày hiện tại về mùng 1 trước khi tính toán tháng.
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);

    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate(); // Lấy số ngày của tháng đang xét
    
    for (let i = 1; i <= daysInMonth; i++) {
        labels.push(`${i}/${month + 1}`);
        
        let dailyRevenue = 0;
        bookings.forEach(b => {
            if (!b.roomId || !b.checkInDate || !b.checkOutDate) return;
            
            const checkIn = new Date(b.checkInDate);
            if (checkIn.getFullYear() === year && checkIn.getMonth() === month && checkIn.getDate() === i) {
                checkIn.setHours(0, 0, 0, 0); // Đưa về 0h
                const checkOut = new Date(b.checkOutDate);
                checkOut.setHours(0, 0, 0, 0); // Đưa về 0h
                const days = Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24));
                if (days > 0) dailyRevenue += days * (b.roomId.price || 0);
            }
        });
        data.push(dailyRevenue);
    }
    return { labels, data };
}

// Hàm chạy khi thay đổi Dropdown "Bộ Lọc" trên giao diện
function updateRevenueChart() {
    if (!revenueChartInstance) return;
    
    const filterValue = document.getElementById('revenueFilter').value;
    let chartData = filterValue === 'thisMonth' ? calculateMonthlyRevenue(globalBookings, 0)
                  : filterValue === 'lastMonth' ? calculateMonthlyRevenue(globalBookings, -1)
                  : calculate7DaysRevenue(globalBookings);

    revenueChartInstance.data.labels = chartData.labels; // Cập nhật lại số cột ngày
    revenueChartInstance.data.datasets[0].data = chartData.data; // Cập nhật lại tiền
    revenueChartInstance.update(); // Load hiệu ứng mượt
}

function renderCharts(rooms, bookings) {
    // 1. BIỂU ĐỒ TRÒN - Tỷ lệ phòng Trống / Đang có khách
    const ctxRoom = document.getElementById('roomStatusChart');
    if (ctxRoom) {
        const availableCount = rooms.filter(r => r.status === 'Available').length;
        const bookedCount = rooms.filter(r => r.status === 'Booked').length;

        if (roomChartInstance) roomChartInstance.destroy(); // Hủy chart cũ nếu bị re-render
        roomChartInstance = new Chart(ctxRoom, {
            type: 'pie',
            data: {
                labels: ['Phòng Trống (Available)', 'Đang có khách (Booked)'],
                datasets: [{
                    data: [availableCount, bookedCount],
                    backgroundColor: ['#10B981', '#EF4444'], // Xanh lá và Đỏ
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: { display: true, text: 'Tỷ lệ trạng thái phòng', font: { size: 16 } }
                }
            }
        });
    }

    // 2. BIỂU ĐỒ CỘT - Doanh thu 7 ngày gần nhất
    const ctxRev = document.getElementById('revenueChart');
    if (ctxRev) {
        // 1. Lấy mảng labels và data từ hàm helper
        const { labels, data } = calculate7DaysRevenue(bookings);

        if (revenueChartInstance) revenueChartInstance.destroy();
        revenueChartInstance = new Chart(ctxRev, {
            type: 'bar',
            data: {
                labels: labels, // 2. Gán mảng nhãn thời gian vào trục X
                datasets: [{
                    label: 'Doanh thu (VNĐ)',
                    data: data,     // 3. Gán mảng giá trị vào trục Y
                    backgroundColor: '#3B82F6', // Xanh dương
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: { display: false }, // Đã có HTML title h3 ở trên rồi nên ta ẩn cái này đi cho gọn
                    legend: { display: false }
                },
                scales: {
                    y: { 
                        beginAtZero: true,
                        // Đặt suggestedMax để giới hạn cao của trục Y không bao giờ bị tụt xuống thấp hơn mức này
                        suggestedMax: 5000000 // Ví dụ: 5.000.000 VNĐ, bạn có thể chỉnh sửa lại số này
                    }
                }
            }
        });
    }
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
            checkInDate.setHours(0, 0, 0, 0);
            checkOutDate.setHours(0, 0, 0, 0);
            const days = Math.round((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
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
    checkIn.setHours(0, 0, 0, 0);
    checkOut.setHours(0, 0, 0, 0);
    const days = Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24));

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