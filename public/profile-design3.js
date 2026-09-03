(function () {
    "use strict";

    function createProgress() {
        if (document.querySelector(".design3-monetization")) return;

        const stats = document.querySelector(".stats");
        if (!stats) return;

        const card = document.createElement("section");
        card.className = "design3-monetization";

        card.innerHTML = `
            <div class="design3-money-content">
                <h2>Monetization Progress</h2>
                <p><strong id="d3WatchHours">0</strong> / 4000 Watch Hours</p>
                <p><strong id="d3Subscribers">0</strong> / 1000 Subscribers</p>
            </div>

            <div class="design3-progress-circle" id="d3ProgressCircle">
                <span id="d3ProgressText">0%</span>
            </div>
        `;

        stats.parentNode.insertBefore(card, stats);
    }

    function createOverview() {
        if (document.querySelector(".design3-overview")) return;

        const stats = document.querySelector(".stats");
        if (!stats) return;

        const overview = document.createElement("section");
        overview.className = "design3-overview";

        overview.innerHTML = `
            <div class="design3-overview-head">
                <h2>Overview</h2>
                <button id="design3AnalyticsBtn" type="button">
                    View Analytics <span>→</span>
                </button>
            </div>
        `;

        stats.parentNode.insertBefore(overview, stats);
    }

    function createVideosHeader() {
        const section = document.querySelector(".videos-section");
        if (!section || section.querySelector(".design3-videos-head")) return;

        const oldTitle = section.querySelector("h2");

        const head = document.createElement("div");
        head.className = "design3-videos-head";

        head.innerHTML = `
            <h2>My Videos</h2>
            <button id="design3ViewAll" type="button">View All →</button>
        `;

        if (oldTitle) oldTitle.remove();

        section.insertBefore(head, section.firstChild);

        document.getElementById("design3ViewAll")?.addEventListener("click", function () {
            document.getElementById("videoList")?.scrollIntoView({
                behavior: "smooth"
            });
        });
    }

    function createBottomNav() {
        if (document.querySelector(".design3-bottom-nav")) return;

        const nav = document.createElement("nav");
        nav.className = "design3-bottom-nav";

        nav.innerHTML = `
            <a href="/home.html">
                <span>⌂</span>
                <small>Home</small>
            </a>

            <a href="/shorts.html">
                <span>◈</span>
                <small>Shorts</small>
            </a>

            <a href="/create.html" class="design3-plus">
                <span>+</span>
            </a>

            <a href="/home.html">
                <span>▣</span>
                <small>Subscriptions</small>
            </a>

            <a href="/profile.html" class="active">
                <span>◉</span>
                <small>You</small>
            </a>
        `;

        document.body.appendChild(nav);
    }

    function setupHeader() {
        document.getElementById("profileNotificationBtn")?.addEventListener(
            "click",
            function () {
                window.location.href = "/notifications.html";
            }
        );

        document.getElementById("profileSettingsBtn")?.addEventListener(
            "click",
            function () {
                alert("Settings coming soon.");
            }
        );
    }

    function setupMyProfile() {
        document.getElementById("myProfileBtn")?.addEventListener(
            "click",
            function () {
                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            }
        );
    }

    function updateProgress() {
        const subscribers =
            Number(document.getElementById("subscribers")?.textContent || 0);

        const watchMinutes =
            Number(document.getElementById("watchMinutes")?.textContent || 0);

        const watchHours = watchMinutes / 60;

        const watchPercent = (watchHours / 4000) * 100;
        const subscriberPercent = (subscribers / 1000) * 100;

        const progress = Math.min(
            100,
            Math.max(watchPercent, subscriberPercent)
        );

        const watchEl = document.getElementById("d3WatchHours");
        const subEl = document.getElementById("d3Subscribers");
        const textEl = document.getElementById("d3ProgressText");
        const circle = document.getElementById("d3ProgressCircle");

        if (watchEl) {
            watchEl.textContent = watchHours < 1
                ? "0"
                : watchHours.toFixed(1);
        }

        if (subEl) {
            subEl.textContent = subscribers;
        }

        if (textEl) {
            textEl.textContent = Math.round(progress) + "%";
        }

        if (circle) {
            circle.style.setProperty(
                "--d3-progress",
                progress + "%"
            );
        }
    }

    function setup() {
        createProgress();
        createOverview();
        createVideosHeader();
        createBottomNav();
        setupHeader();
        setupMyProfile();

        setTimeout(updateProgress, 500);
        setTimeout(updateProgress, 1500);
        setTimeout(updateProgress, 3000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setup);
    } else {
        setup();
    }
})();
