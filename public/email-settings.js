const token = localStorage.getItem('udaan_token');

if (!token) {
    location.href = '/index.html';
}

const emailInput = document.getElementById('email');
const saveBtn = document.getElementById('saveBtn');
const resendBtn = document.getElementById('resendBtn');
const statusBox = document.getElementById('status');
const verifiedBox = document.getElementById('verifiedBox');
const verifyState = document.getElementById('verifyState');
const region = document.getElementById('region');

function showStatus(message) {
    statusBox.textContent = message;
    statusBox.classList.add('show');
}

async function loadEmail() {
    try {
        const response = await fetch('/api/account/email', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Unable to load email');
        }

        emailInput.value = data.email || '';
        region.textContent = data.dataRegion || 'GLOBAL';

        if (data.emailVerified) {
            verifyState.textContent = 'Verified ✓';
            verifiedBox.hidden = false;
            resendBtn.hidden = true;
            saveBtn.textContent = 'Change Email';
        } else if (data.email) {
            verifyState.textContent = 'Not verified';
            verifiedBox.hidden = true;
            resendBtn.hidden = false;
            saveBtn.textContent = 'Change Email';
        }
    } catch (error) {
        showStatus(error.message);
    }
}

saveBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();

    if (!email) {
        showStatus('Please enter your email address.');
        return;
    }

    saveBtn.disabled = true;
    showStatus('Linking email...');

    try {
        const response = await fetch('/api/account/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Unable to link email');
        }

        if (data.verificationSent) {
            showStatus(
                'Email linked successfully. Check your Gmail and tap Verify Email. 📧'
            );
            resendBtn.hidden = false;
        } else {
            showStatus(
                'Email linked. Gmail verification is not configured on the server yet.'
            );
        }

        verifyState.textContent = 'Not verified';
        verifiedBox.hidden = true;
        saveBtn.textContent = 'Change Email';

    } catch (error) {
        showStatus(error.message);
    } finally {
        saveBtn.disabled = false;
    }
});

resendBtn.addEventListener('click', async () => {
    resendBtn.disabled = true;
    showStatus('Sending verification email...');

    try {
        const response = await fetch(
            '/api/account/email/resend',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || 'Unable to send verification email'
            );
        }

        showStatus(
            'Verification email sent again. Check your Gmail. 📧'
        );
    } catch (error) {
        showStatus(error.message);
    } finally {
        resendBtn.disabled = false;
    }
});

loadEmail();
