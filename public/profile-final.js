(function () {
    "use strict";

    function iconCamera(button) {
        if (!button) return;

        button.innerHTML = "";
        button.setAttribute("aria-label", "Change profile photo");

        const camera = document.createElement("span");
        camera.style.cssText = `
            position:absolute;
            width:27px;
            height:19px;
            border:3px solid #fff;
            border-radius:5px;
            left:17px;
            top:22px;
            box-sizing:border-box;
        `;

        const lens = document.createElement("span");
        lens.style.cssText = `
            position:absolute;
            width:9px;
            height:9px;
            border:2px solid #fff;
            border-radius:50%;
            left:6px;
            top:3px;
            box-sizing:border-box;
        `;

        camera.appendChild(lens);
        button.appendChild(camera);
    }

    function addStudioLineIcon() {
        const btn = document.getElementById("creatorStudioBtn");
        if (!btn) return;

        btn.innerHTML = "";

        const icon = document.createElement("span");
        icon.innerHTML = `
            <svg width="22" height="22" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round"
                 stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="3"/>
                <path d="M8 8h8"/>
                <path d="M8 12h5"/>
                <path d="M8 16h3"/>
            </svg>
        `;

        icon.style.cssText =
            "display:inline-flex;vertical-align:middle;margin-right:9px;";

        btn.appendChild(icon);
        btn.appendChild(document.createTextNode("Creator Studio"));

        btn.onclick = function () {
            window.location.href = "/studio.html";
        };
    }

    function setup() {
        iconCamera(document.getElementById("photoMenuBtn"));
        addStudioLineIcon();

        const name = document.getElementById("name");

        if (name && name.textContent.trim() === "Profile loading failed") {
            const saved = localStorage.getItem("udaan_user");

            if (saved) {
                try {
                    const user = JSON.parse(saved);

                    if (user.name) {
                        name.textContent = user.name;
                    }

                    const username =
                        document.getElementById("username");

                    if (username && user.username) {
                        username.textContent =
                            "@" + user.username;
                    }
                } catch (e) {
                    console.log("Cached profile unavailable");
                }
            }
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setup);
    } else {
        setup();
    }
})();
