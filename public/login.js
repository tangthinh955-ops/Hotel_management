const API_URL = 'http://localhost:3000/api';

console.log("🚀 login.js script loaded!");

// 1. KIỂM TRA NẾU ĐÃ ĐĂNG NHẬP THÌ CHUYỂN VỀ TRANG CHỦ
if (localStorage.getItem('token')) {
    console.log("✅ Token found, redirecting to index.html");
    window.location.href = 'index.html';
}

// 2. CHỈ CHẠY CODE KHI TOÀN BỘ TRANG ĐÃ TẢI XONG
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed.");

    const errorDiv = document.getElementById('error-message');
    const loginForm = document.getElementById('loginForm');

    // Kiểm tra xem form có tồn tại không
    if (!loginForm) {
        console.error("🔴 Lỗi nghiêm trọng: Không tìm thấy form với id='loginForm'");
        alert("Lỗi nghiêm trọng: Không tìm thấy form đăng nhập trên trang!");
        return;
    }

    // 3. LẮNG NGHE SỰ KIỆN BẤM NÚT ĐĂNG NHẬP
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault(); // Ngăn trang load lại
        console.log("🟢 Submit event captured!");

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitButton = loginForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;

        // Vô hiệu hóa nút và hiện chữ "Đang xử lý" để người dùng biết
        submitButton.disabled = true;
        submitButton.innerHTML = 'Đang xử lý...';

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                errorDiv.style.display = 'block';
                errorDiv.innerText = data.message || 'Lỗi đăng nhập không xác định.';
            } else {
                errorDiv.style.display = 'none';
                localStorage.setItem('token', data.token);
                localStorage.setItem('userEmail', email); // Lưu lại email để hiển thị lên Navbar
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error("🔴 API Fetch Error:", error);
            errorDiv.style.display = 'block';
            errorDiv.innerText = 'Không thể kết nối tới server! (Kiểm tra Console F12)';
        } finally {
            // Dù thành công hay thất bại, trả lại trạng thái ban đầu cho nút bấm
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });
});