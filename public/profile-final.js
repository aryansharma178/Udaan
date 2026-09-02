(function(){

  function addFinalUI(){

    const card = document.querySelector('.profile-card');
    const stats = document.querySelector('.stats');

    if(!card || !stats) return;

    /* Monetization progress */
    if(!document.querySelector('.final-monetization')){
      const box=document.createElement('div');
      box.className='final-monetization';
      box.innerHTML=`
        <div class="final-monetization-title">Monetization Progress</div>
        <div class="final-progress-row">
          <div class="final-progress-text">
            <div><b id="finalWatchHours">0</b> / 4000 Watch Hours</div>
            <div><b id="finalSubs">0</b> / 1000 Subscribers</div>
          </div>
          <div class="final-progress-circle" id="finalProgressCircle">
            <span id="finalProgress">0%</span>
          </div>
        </div>`;
      stats.parentNode.insertBefore(box,stats);
    }

    /* Overview */
    if(!document.querySelector('.final-overview')){
      const overview=document.createElement('div');
      overview.className='final-overview';
      overview.innerHTML=`
        <h2>Overview</h2>
        <button class="final-analytics" type="button"
          onclick="location.href='/studio.html'">
          View Analytics →
        </button>`;
      stats.parentNode.insertBefore(overview,stats);
    }

    /* My Videos heading */
    const videoSection=document.querySelector('.videos-section');
    if(videoSection && !videoSection.querySelector('.final-videos-head')){
      const h=videoSection.querySelector('h2');
      if(h){
        const wrap=document.createElement('div');
        wrap.className='final-videos-head';
        h.parentNode.insertBefore(wrap,h);
        wrap.appendChild(h);
        const link=document.createElement('a');
        link.className='final-view-all';
        link.href='/profile.html';
        link.textContent='View All →';
        wrap.appendChild(link);
      }
    }

    /* Bottom nav */
    if(!document.querySelector('.final-bottom-nav')){
      const nav=document.createElement('nav');
      nav.className='final-bottom-nav';
      nav.innerHTML=`
        <a href="/home.html">⌂<br>Home</a>
        <a href="/shorts.html">◉<br>Shorts</a>
        <a href="/create.html" class="create">+</a>
        <a href="/home.html">▣<br>Subscriptions</a>
        <a href="/profile.html" class="active">◯<br>You</a>`;
      document.body.appendChild(nav);
    }
  }

  function updateProgress(user){

    user=user||{};

    const watchMinutes=Number(user.watch_minutes||0);
    const subscribers=Number(user.subscribers||0);
    const watchHours=watchMinutes/60;

    const percent=Math.min(
      100,
      Math.round(
        Math.min(watchHours/4000,1)*50+
        Math.min(subscribers/1000,1)*50
      )
    );

    const wh=document.getElementById('finalWatchHours');
    const sub=document.getElementById('finalSubs');
    const p=document.getElementById('finalProgress');
    const circle=document.getElementById('finalProgressCircle');

    if(wh) wh.textContent=Math.floor(watchHours);
    if(sub) sub.textContent=subscribers;
    if(p) p.textContent=percent+'%';
    if(circle) circle.style.setProperty('--progress',percent+'%');
  }

  async function refreshProfileData(){

    try{
      const saved=localStorage.getItem('udaan_user');
      if(!saved) return;

      const user=JSON.parse(saved);
      updateProgress(user);

      const username=user.username;
      if(!username) return;

      const response=await fetch(
        '/api/profile/'+encodeURIComponent(username)
      );

      if(!response.ok) throw new Error('profile api failed');

      const result=await response.json();
      const profile=result.profile||result.user||{};

      if(profile.name){
        const n=document.getElementById('name');
        if(n) n.textContent=profile.name;
      }

      if(profile.username){
        const u=document.getElementById('username');
        if(u) u.textContent='@'+profile.username;
      }

      if(document.getElementById('subscribers'))
        document.getElementById('subscribers').textContent=profile.subscribers||0;

      if(document.getElementById('videos'))
        document.getElementById('videos').textContent=profile.videos||0;

      if(document.getElementById('views'))
        document.getElementById('views').textContent=profile.totalViews||profile.views||0;

      if(document.getElementById('likes'))
        document.getElementById('likes').textContent=profile.totalLikes||profile.likes||0;

      if(document.getElementById('watchMinutes'))
        document.getElementById('watchMinutes').textContent=profile.watch_minutes||0;

      if(document.getElementById('earnings'))
        document.getElementById('earnings').textContent='₹'+
          Number(profile.earnings||0).toFixed(2);

      updateProgress(profile);

    }catch(e){
      /* Keep cached user data instead of showing a blank profile */
      try{
        updateProgress(
          JSON.parse(localStorage.getItem('udaan_user')||'{}')
        );
      }catch(_){}
    }
  }

  document.addEventListener('DOMContentLoaded',function(){
    addFinalUI();
    refreshProfileData();
  });

})();
