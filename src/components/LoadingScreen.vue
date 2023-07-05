<template>
    <div :class="['loading-screen-container', loadingState === 1 ? 'fade' : '', loadingState === 2 ? 'hide' : '']">
        <h2>Loading</h2>
        <div class="bamboo-container">
            <span class="slash left"></span>
            <span class="slash right"></span>
            <img src="/icons/loading_bamboo.svg" alt="Bamboo stand">
        </div>
    </div>
</template>

<script setup lang="ts">
import { watch } from "vue";
import { ref } from "vue";

const props = defineProps(["isLoading"]);
const loadingState = ref(0);

watch(() => props.isLoading, () => {
    if(!props.isLoading) {
        loadingState.value = 1;
        setTimeout(() => {
            loadingState.value = 2;
        }, 1000);
    }
});

</script>

<style scoped lang="scss">
.loading-screen-container {
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    flex-direction: column;
    padding-bottom: 100px;
    background-color: var(--dark);
    position: absolute;
    left: 0;
    top: 0;
    width: 100vw;
    height: 100vh;
    z-index: 2;
    background-image: url("/img/background_text.png");
    background-size: cover;
    background-repeat: no-repeat;
    gap: 24px;
    -webkit-user-drag: none;
    -webkit-user-select: none;    
    user-select: none;
    transition: opacity 1000ms ease-in;

    h2 {
        font-family: "Bree serif";
        font-size: 40px;
        font-weight: 400;
        letter-spacing: 5px;
        position: relative;

        &::after {
            content: "";
            display: block;
            position: absolute;
            left: 100%;
            bottom: 0;
            color: inherit;
            font-size: inherit;
            animation: loading-text 1500ms linear infinite;
        }
    }

    .bamboo-container {
        position: relative;

        img {
            width: 100px;
            -webkit-user-drag: none;
            -webkit-user-select: none;    
            user-select: none;
        }

        .slash {
            display: block;
            position: absolute;
            width: 225%;
            left: -60%;
            top: 30%;

            &::after {
                content: "";
                display: block;
                position: absolute;
                left: 0;
                top: 0;
                border-radius: 50%;
                width: 0;
                height: 2px;
                background: linear-gradient(45deg, #fff 0%, var(--slash) 100%);
                animation: slash 900ms linear infinite;
                opacity: 0.7;
            }

            &.left {
                transform: rotateZ(31deg);
                animation: slash-rotation 4500ms linear infinite;
            }

            &.right {
                transform: rotateZ(165deg);
                animation: slash-rotation-2 4000ms linear infinite;
                animation-delay: 600ms;

                &::after {
                    animation-delay: 600ms;
                    animation-duration: 800ms;
                }
            }
        }
    }

    &.fade {
        opacity: 0;
    }

    &.hide {
        display: none;
    }
}

@keyframes slash {
    0% {
        width: 0;
        left: 0;
        opacity: 0;
    }
    2% {
        opacity: 1;
    }
    50% {
        width: 100%;
        left: 0;
    }
    98% {
        opacity: 1;
    }
    100% {
        opacity: 0;
        width: 0;
        left: 100%;
    }
}

@keyframes slash-rotation {
    0%, 19.999% {
        transform: rotateZ(30deg);
    }
    20%, 39.999% {
        transform: rotateZ(80deg);
    }
    40%, 59.999% {
        transform: rotateZ(190deg);
    }
    60%, 79.999% {
        transform: rotateZ(220deg);
    }
    80%, 99.999% {
        transform: rotateZ(300deg);
    }
}

@keyframes slash-rotation-2 {
    0%, 19.999% {
        transform: rotateZ(120deg);
    }
    20%, 39.999% {
        transform: rotateZ(10deg);
    }
    40%, 59.999% {
        transform: rotateZ(3300deg);
    }
    60%, 79.999% {
        transform: rotateZ(10deg);
    }
    80%, 99.999% {
        transform: rotateZ(200deg);
    }
}

@keyframes loading-text {
    0% {
        content: "";
    }
    25% {
        content: ".";  
    }
    50% {
        content: "..";
    }
    75% {
        content: "...";
    }
}
</style>