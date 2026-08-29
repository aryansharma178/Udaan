const form = document.getElementById('authForm');
const title = document.getElementById('title');
const nameBox = document.getElementById('nameBox');
const nameInput = document.getElementById('name');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submitBtn');
const message = document.getElementById('message');
const switchBtn = document.getElementById('switchBtn');
const switchText = document.getElementById('switchText');

let isSignup = false;

switchBtn.addEventListener('click', () => {
    isSignup = !isSignup;

    title.textContent = isSignup ? 'Create Account' : 'Login';
    submitBtn.textContent = isSignup ? 'Sign Up' : 'Login';

    nameBox.classList.toggle('hidden', !isSignup);

    switchText.textContent = isSignup
        ? 'Already have an account?'
        : 'New to UDAAN?';

    switchBtn.textContent = isSignup
        ? 'Login'
        : 'Create Account';

    message.textContent = '';
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
        username: usernameInput.value.trim(),
        password: passwordInput.value
    };

    if (isSignup) {
        data.name = nameInput.value.trim();
    }

    const endpoint = isSignup
        ? '/api/signup'
        : '/api/login';

    message.textContent = 'Please wait...';

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message);
        }

        message.textContent = result.message;

        if (!isSignup) {
            localStorage.setItem('udaan_token', result.token);
            localStorage.setItem('udaan_user', JSON.stringify(result.user));

            setTimeout(() => {
                window.location.href = '/home.html';
            }, 300);
        }

    } catch (error) {
        message.textContent = error.message;
    }
});
