(function(){
"use strict";

const token=localStorage.getItem("udaan_token")||"";
const saved=localStorage.getItem("udaan_user");

if(!token && !saved){
 location.href="/index.html";
 return;
}

let current=null;

try{
 current=saved?JSON.parse(saved):null;
}catch(e){current=null}

function $(id){return document.getElementById(id)}

async function load(){
 try{
  const username=current?.username;

  if(!username){
   throw new Error("User not found");
  }

  const response=await fetch(
   "/api/profile/"+encodeURIComponent(username)
  );

  const data=await response.json();

  if(!response.ok || !data.profile){
   throw new Error(data.message||"Profile unavailable");
  }

  const p=data.profile;

  $("creatorName").textContent="Welcome, "+(p.name||username)+" 🚀";
  $("videos").textContent=p.videos||0;
  $("views").textContent=p.totalViews||0;
  $("likes").textContent=p.totalLikes||0;
  $("subs2").textContent=p.subscribers||0;
  $("subscribers").textContent=p.subscribers||0;
  $("minutes").textContent=p.watch_minutes||0;
  $("earnings").textContent="₹"+Number(p.earnings||0).toFixed(2);

  const hours=Number(p.watch_hours||0);
  $("watchHours").textContent=hours;

  const progress=Math.min(
   100,
   Math.max(
    (hours/4000)*100,
    ((p.subscribers||0)/1000)*100
   )
  );

  $("progress").textContent=Math.round(progress)+"%";
  $("progress").style.background=
   "conic-gradient(#a34cff "+progress+"%,#ffffff18 0)";

  $("eligible").textContent=
   p.monetization?.eligible?"Eligible ✓":"Not Eligible";

  $("aViews").textContent=p.totalViews||0;
  $("aHours").textContent=hours;
  $("aLikes").textContent=p.totalLikes||0;

  loadVideos(username);

 }catch(error){
  console.error(error);
  $("creatorName").textContent="Creator Studio";
  loadVideos(current?.username);
 }
}

async function loadVideos(username){
 const box=$("videoList");

 if(!username){
  box.innerHTML="<p class='loading'>No creator found.</p>";
  return;
 }

 try{
  const response=await fetch("/api/videos/");
  const videos=await response.json();

  const mine=(Array.isArray(videos)?videos:[])
   .filter(v=>v.username===username)
   .reverse();

  if(!mine.length){
   box.innerHTML=
    "<p class='loading'>No videos yet. Upload your first video 🚀</p>";
   return;
  }

  box.innerHTML=mine.map(v=>`
   <div class="video-item">
    <h3>${escapeHtml(v.title||"Untitled Video")}</h3>
    <p>👁 ${v.views||0} views · ❤️ ${v.likes||0} likes</p>
    <p>⏱ ${v.watchMinutes||0} watch minutes</p>
   </div>
  `).join("");

 }catch(error){
  box.innerHTML="<p class='loading'>Unable to load content.</p>";
 }
}

function escapeHtml(value){
 return String(value)
  .replace(/&/g,"&amp;")
  .replace(/</g,"&lt;")
  .replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;")
  .replace(/'/g,"&#039;");
}

window.showAnalytics=function(){
 $("analytics").classList.toggle("hidden");
 $("analytics").scrollIntoView({behavior:"smooth"});
};

load();

})();
