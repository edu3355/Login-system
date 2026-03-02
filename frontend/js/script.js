// API 기본 URL (FastAPI 서버 주소)
const API_BASE_URL = 'http://localhost:8001';

// 토큰 저장소
let accessToken = localStorage.getItem('accessToken');
let currentUser = null;

// 페이지 로드 시 토큰 확인
window.onload = function() {
    if (accessToken) {
        checkUserStatus();
    }
};

// 메시지 표시 함수
function showMessage(message, type = 'success') {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove('hidden');
    animateContainerHeight();
    setTimeout(() => {
        messageDiv.classList.add('hidden');
        animateContainerHeight(      );
    }, 5000);
}

// 폼 전환 함수들
function showSignupForm() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('signupForm').classList.remove('hidden');
    document.getElementById('userSection').classList.add('hidden');
    animateContainerHeight();
}

function showLoginForm() {
    document.getElementById('signupForm').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('userSection').classList.add('hidden');
    animateContainerHeight();
}

function showUserSection() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('signupForm').classList.add('hidden');
    document.getElementById('userSection').classList.remove('hidden');
    animateContainerHeight();
}

// container 높이 애니메이션 함수
function animateContainerHeight() {
    const container = document.querySelector('.container');
    if (!container) return;
    // 현재 높이로 max-height를 고정
    const prevHeight = container.offsetHeight;
    container.style.maxHeight = prevHeight + 'px';
    // 강제로 리플로우 발생 (브라우저가 스타일을 적용하도록)
    container.offsetHeight;
    // 다음 프레임에서 실제 높이로 트랜지션
    requestAnimationFrame(() => {
        const newHeight = container.scrollHeight;
        container.style.maxHeight = newHeight + 'px';
    });
}

// 모달 관련 함수들
function showSignoutModal() {
    document.getElementById('signoutModal').classList.remove('hidden');
    document.getElementById('signoutPassword').focus();
    // 모달 열 때 오류 메시지 초기화
    hideSignoutError();
}

function hideSignoutModal() {
    document.getElementById('signoutModal').classList.add('hidden');
    document.getElementById('signoutPassword').value = '';
    hideSignoutError();
}

// 모달 내부 오류 메시지 표시 함수
function showSignoutError(message) {
    const errorDiv = document.getElementById('signoutError');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function hideSignoutError() {
    const errorDiv = document.getElementById('signoutError');
    errorDiv.classList.add('hidden');
}

// 회원가입 함수
async function signup() {
    const username = document.getElementById('signupUsername').value;
    const password = document.getElementById('signupPassword').value;
    const passwordVerify = document.getElementById('signupPasswordVerify').value;

    if (!username || !password || !passwordVerify) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    if (password !== passwordVerify) {
        showMessage('Passwords do not match', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                password: password,
                password_verify: passwordVerify
            })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Signed up successfully', 'success');
            showLoginForm();
            // 폼 초기화
            document.getElementById('signupUsername').value = '';
            document.getElementById('signupPassword').value = '';
            document.getElementById('signupPasswordVerify').value = '';
        } else {
            showMessage(data.detail || 'Sign up failed', 'error');
        }
    } catch (error) {
        showMessage('Failed to connect to the server', 'error');
        console.error('Error:', error);
    }
}

// 로그인 함수
async function login() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        showMessage('Please enter your username and password', 'error');
        return;
    }

    try {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            accessToken = data.access_token;
            localStorage.setItem('accessToken', accessToken);
            currentUser = { username: username };
            
            showMessage('Signed in successfully', 'success');
            updateUserInfo();
            showUserSection();
            
            // 폼 초기화
            document.getElementById('loginUsername').value = '';
            document.getElementById('loginPassword').value = '';
        } else {
            let msg = data.detail;
            if (msg === 'Invalid credentials.') {
                msg = 'Invalid username or password';
            }
            showMessage(msg || 'Login failed', 'error');
        }
    } catch (error) {
        showMessage('Failed to connect to the server', 'error');
        console.error('Error:', error);
    }
}

// 사용자 상태 확인
async function checkUserStatus() {
    if (!accessToken) return;

    try {
        const response = await fetch(`${API_BASE_URL}/`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.ok) {
            updateUserInfo();
            showUserSection();
        } else {
            // 토큰이 만료되었거나 유효하지 않음
            logout();
        }
    } catch (error) {
        console.error('Error checking user status:', error);
        logout();
    }
}

// 사용자 정보 업데이트
function updateUserInfo() {
    if (currentUser) {
        document.getElementById('userInfo').textContent = currentUser.username;
    }
}

// 회원탈퇴 확인 함수
async function confirmSignout() {
    const password = document.getElementById('signoutPassword').value;

    if (!password) {
        showSignoutError('Please enter your password');
        return;
    }

    if (!accessToken) {
        showSignoutError('Login is required');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/signout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: password
            })
        });

        const data = await response.json();

        if (response.ok) {
            hideSignoutModal();
            logout('Your account has been deleted');
        } else {
            // 비밀번호가 틀렸거나 다른 오류가 발생한 경우
            const errorMessage = data.detail || 'Account deletion failed';
            if (errorMessage.includes('비밀번호') || errorMessage.includes('password') || 
                errorMessage.includes('incorrect') || errorMessage.includes('Invalid')) {
                showSignoutError('Password is incorrect');
            } else {
                showSignoutError(errorMessage);
            }
        }
    } catch (error) {
        showSignoutError('Failed to connect to the server');
        console.error('Error:', error);
    }
}

// 로그아웃 함수
function logout(message = 'Logged out') {
    accessToken = null;
    currentUser = null;
    localStorage.removeItem('accessToken');
    showLoginForm();
    showMessage(message, 'success');
}

// 모달 외부 클릭 시 닫기
window.onclick = function(event) {
    const modal = document.getElementById('signoutModal');
    if (event.target === modal) {
        hideSignoutModal();
    }
}

// Enter 키로 회원탈퇴 확인
document.getElementById('signoutPassword').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        confirmSignout();
    }
});

// 비밀번호 입력 필드에서 입력할 때 오류 메시지 숨기기
document.getElementById('signoutPassword').addEventListener('input', function() {
    hideSignoutError();
});