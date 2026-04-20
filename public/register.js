const API_URL = 'http://localhost:3000/api';

// KIỂM TRA NẾU ĐÃ ĐĂNG NHẬP THÌ CHUYỂN VỀ TRANG CHỦ
if (localStorage.getItem('token')) {
    window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
    const msgBox = document.getElementById('message-box');
    const registerForm = document.getElementById('registerForm');

    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const submitButton = registerForm.querySelector('button[type="submit"]');

        // Kiểm tra xem 2 mật khẩu nhập có giống nhau không
        if (password !== confirmPassword) {
            msgBox.style.display = 'block';
            msgBox.style.backgroundColor = '#fee2e2';
            msgBox.style.color = '#b91c1c';
            msgBox.style.border = '1px solid #f87171';
            msgBox.innerText = 'Mật khẩu xác nhận không khớp!';
            return;
        }

        submitButton.disabled = true;
        submitButton.innerHTML = 'Đang xử lý...';

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();

            msgBox.style.display = 'block';
            if (!response.ok) {
                msgBox.style.backgroundColor = '#fee2e2';
                msgBox.style.color = '#b91c1c';
                msgBox.innerText = data.message || 'Lỗi đăng ký.';
                submitButton.disabled = false;
                submitButton.innerHTML = 'ĐĂNG KÝ';
            } else {
                msgBox.style.backgroundColor = '#d1fae5';
                msgBox.style.color = '#065f46';
                msgBox.innerText = 'Đăng ký thành công! Đang chuyển đến trang đăng nhập...';
                setTimeout(() => window.location.href = 'login.html', 1500);
            }
        } catch (error) {
            msgBox.style.display = 'block';
            msgBox.style.backgroundColor = '#fee2e2';
            msgBox.style.color = '#b91c1c';
            msgBox.innerText = 'Không thể kết nối tới server!';
            submitButton.disabled = false;
            submitButton.innerHTML = 'ĐĂNG KÝ';
        }
    });
});