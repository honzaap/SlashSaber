<template>
    <div class="page" :class="{overlay: props.overlay, hide: hide}">
        <nav class="navbar">
            <img class="nav-logo" src="/logo_white.svg" alt="Slash Saber logo">
        </nav>
        <main class="container">
            <h1>Slash Saber</h1>
            <p class="motto">Lorem ipsum dolor sit amet</p>
            <div class="btn-container">
                <ButtonSlash text="Enter game" @click="enterGame" />
            </div>
            <div class="how-play">
                <h2>How to play</h2>
                <div class="list">
                    <div class="item">
                        <div class="ico">
                            <img src="/icons/how_play_1.svg" alt="Slashing bamboo">
                        </div>
                        <p>Slash obstacles with your sword using the mouse</p>
                    </div>
                    <div class="item">
                        <div class="ico">
                            <img src="/icons/how_play_2.svg" alt="Slash from wrong direction">
                        </div>
                        <p>Some obstacles can only be slashed from one direction</p>
                    </div>
                    <div class="item">
                        <div class="ico">
                            <img src="/icons/how_play_3.svg" alt="Three obstacles missed">
                        </div>
                        <p>Game ends when you let 3 obstacles hit you</p>
                    </div>
                </div>
            </div>
        </main>
        <div class="leaderboard">
            <!--LeaderBoard /-->
        </div>
        <img src="/img/background_text.png" alt="Slash Saber" class="background-text">
        <!-- Github corner -->
        <a href="https://github.com/honzaap/SlashSaber" target="_blank" class="github-corner" style="z-index: 5000; position: absolute; top: 0; border: 0; right: 0;">
            <svg width="60" height="60" viewBox="0 0 250 250" style="color:#000;">
                <path fill="#70A480" d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z"></path><path d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2" fill="currentColor" style="transform-origin: 130px 106px;" class="octo-arm"></path><path d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z" fill="currentColor" class="octo-body"></path>
            </svg>
        </a>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import ButtonSlash from "../components/ButtonSlash.vue";
//import LeaderBoard from "../components/LeaderBoard.vue";
const emit = defineEmits(["switch"]);

const props = defineProps(["overlay"]);

const hide = ref(false);

function enterGame() {
    if(props.overlay) {
        hide.value = true;
        setTimeout(() => {
            emit("switch", "scene");
            hide.value = false;
        }, 300);
    }
    else {
        emit("switch", "scene");
    }
}

</script>

<style scoped lang="scss">
@mixin no-drag {
    -webkit-user-drag: none;
    user-drag: none;
    -moz-user-select: none;
    -webkit-user-select: none;    
    user-select: none;
}

.page {
    &.overlay {
        position: absolute;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: var(--dark);
        transform: translateY(-100%);
        animation: overlay-down 300ms ease forwards;
    }

    &.hide {
        transform: translateY(0);
        animation: overlay-up 300ms ease forwards;
    }
}

@keyframes overlay-down {
    0% {
        transform: translateY(-100%);
    }
    100% {
        transform: translateY(0);
    }
}

@keyframes overlay-up {
    0% {
        transform: translateY(0);
    }
    100% {
        transform: translateY(-100%);
    }
}

.navbar {
    padding: 20px 30px;
    .nav-logo {
        display: block;
        height: 180px;
        @include no-drag;
    }

    @media (max-width: 768px) {
        padding: 20px;
        display: flex;
        justify-content: center;
        align-items: center;

        .nav-logo {
            height: 130px;
        }
    }
}

h1 {
    font-family: "Bree serif";
    font-size: 64px;
    letter-spacing: 10px;
    font-weight: 400;
    @include no-drag;

    @media (max-width: 570px) {
        font-size: 42px;
        letter-spacing: 5px;
    }
}

.motto {
    font-size: 24px;
    color: var(--primary);
    @include no-drag;
}

.container {
    width: 100%;
    max-width: 1000px;
    margin-left: auto;
    margin-right: auto;
    margin-top: -40px;    
    text-align: center;

    @media (max-width: 768px) {
        margin-top: 0;
    }
}

.btn-container {
    margin-top: 80px;
}

.how-play {
    margin-top: 100px;

    h2 {
        font-size: 24px;
    }

    .list {
        display: flex;
        justify-content: center;
        gap: 40px;
        margin-top: 20px;
        flex-wrap: wrap;
        padding: 0 15px;

        .item {
            max-width: 150px;

            .ico {
                background-color: #000;
                width: 150px;
                height: 150px;
                padding: 10px;
                border-radius: 50%;
                display: flex;
                justify-content: center;
                align-items: center;
                margin-bottom: 16px;
                @include no-drag;
            }
        }
    }
}

.leaderboard {
    position: absolute;
    right: 30px;
    top: 50%;
    transform: translateY(-50%);
}

.github-corner:hover .octo-arm {
    animation:octocat-wave 560ms ease-in-out
}
@keyframes octocat-wave {
    0%, 100% {
        transform:rotate(0);
    }
    20%, 60% {
        transform: rotate(-25deg);
    } 
    40%, 80% {
    transform:rotate(10deg);
    }
}
@media (max-width:500px) {
    .github-corner:hover .octo-arm {
        animation: none; 
    } 
    .github-corner .octo-arm { 
        animation: octocat-wave 560ms ease-in-out
    }
}
</style>