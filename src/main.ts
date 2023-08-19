const startBtn = document.getElementById("startBtn");
const page = document.getElementById("main");
let isOverlay = false;
let vueLoaded = false;

let vue : typeof import("vue");
let Scene : any;
let vuetify : any;

async function loadVue() {
    vue = await import("vue");
    Scene = vue.defineAsyncComponent(() =>
        import("./pages/Scene.vue")
    );
    await import("vuetify/_styles.scss");
    const vuet = await import("vuetify");
    const components = await import("vuetify/components");
    const directives = await import("vuetify/directives");
    await import("@mdi/font/css/materialdesignicons.css");

    vuetify = vuet.createVuetify({
        components,
        directives,
    });

    // Load landing page LeaderBoard 
    const LeaderBoard = vue.defineAsyncComponent(() =>
        import("./components/LeaderBoard.vue")
    );
    vue.createApp(LeaderBoard).mount("#leaderBoard");
    
    vueLoaded = true;
}

async function loadScene() {
    if(!page || !vueLoaded) return;

    if(!isOverlay) {
        isOverlay = true;

        vue.createApp(Scene).use(vuetify).provide("switchPage", () => {
            page.classList.add("overlay");
            setTimeout(() => {
                page.classList.remove("hide");
            });
        }).mount("#app");
    }
    
    page.classList.add("hide");
}

startBtn?.addEventListener("click", loadScene);

import "./style.scss";
loadVue();