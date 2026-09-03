const form = document.getElementById('authForm');
const title = document.getElementById('title');
const nameBox = document.getElementById('nameBox');
const nameInput = document.getElementById('name');
const emailBox = document.getElementById('emailBox');
const emailInput = document.getElementById('email');
const countryBox = document.getElementById('countryBox');
const countryInput = document.getElementById('country');
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
    emailBox.classList.toggle('hidden', !isSignup);
    countryBox.classList.toggle('hidden', !isSignup);

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
        data.email = emailInput.value.trim();
        data.country = countryInput.value;
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

/* =========================================
   UDAAN FRONTEND ERROR MONITORING
   ========================================= */

(function () {
    const ERROR_ENDPOINT = '/api/client-errors';

    function sendClientError(type, error, extra = {}) {
        try {
            const user = JSON.parse(
                localStorage.getItem('udaan_user') || 'null'
            );

            const payload = {
                type,
                message: error?.message || String(error || 'Unknown client error'),
                stack: error?.stack || null,
                page: window.location.pathname,
                username: user?.username || null,
                created_at: new Date().toISOString(),
                extra
            };

            fetch(ERROR_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(() => {});
        } catch (_) {
            // Monitoring must never break the application.
        }
    }

    window.addEventListener('error', (event) => {
        sendClientError(
            'javascript_error',
            event.error || new Error(event.message || 'Unknown JavaScript error'),
            {
                filename: event.filename || null,
                line: event.lineno || null,
                column: event.colno || null
            }
        );
    });

    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason instanceof Error
            ? event.reason
            : new Error(String(event.reason || 'Unhandled promise rejection'));

        sendClientError(
            'unhandled_promise',
            reason
        );
    });

    const originalFetch = window.fetch;

    window.fetch = async function (...args) {
        try {
            const response = await originalFetch.apply(this, args);

            if (!response.ok) {
                sendClientError(
                    'api_error',
                    new Error(`API request failed: HTTP ${response.status}`),
                    {
                        url: typeof args[0] === 'string'
                            ? args[0]
                            : args[0]?.url || null,
                        status: response.status
                    }
                );
            }

            return response;
        } catch (error) {
            sendClientError(
                'network_error',
                error,
                {
                    url: typeof args[0] === 'string'
                        ? args[0]
                        : args[0]?.url || null
                }
            );

            throw error;
        }
    };
})();
