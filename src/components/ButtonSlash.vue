<template>
     <button :disabled="disable" @click="$emit('click')" :class="['btn-slash', hasMouseDown ? 'click' : '', alt ? 'alt' : '']" @mousedown="mouseDown" @mouseup="mouseUp" @mouseenter="mouseEnter">
        <div class="bg"></div>
        <span v-if="!alt" :class="['slash', showSlash ? 'anim' : '']"></span>
        {{ text }}
    </button>
</template>

<script setup lang="ts">
import { ref } from "vue";

defineProps(["text", "alt", "disable"]);
defineEmits(["click"]);

const hasMouseDown = ref(false);
const showSlash = ref(false);

function mouseDown () {
    hasMouseDown.value = true;
}

function mouseUp() {
    hasMouseDown.value = false;
}

function mouseEnter() {
    showSlash.value = false;
    setTimeout(() => {
        showSlash.value = true;
    }, 10);
}
</script>

<style lang="scss" scoped>
.btn-slash {
    position: relative;
    padding: 24px 60px;
    background-color: transparent;
    border: 0;
    outline: none;
    color: #000;
    font-weight: 500;
    font-family: "Kanit";
    font-size: 20px;
    cursor: pointer;
    z-index: 2;
    transition: color 300ms ease 250ms, transform 120ms ease;
    box-shadow: inset 0 0 0 4px #fff;
    min-width: 280px;

    &.click {
        transform: scale(0.95);
    }

    .bg {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        z-index: -2;
    }

    .bg::before, .bg::after {
        content: "";
        position: absolute;
        display: block;
        left: 0;
        width: 100%;
        background-color: #fff;
        transition: all 300ms ease;
        transition-delay: 200ms;
    }

    .bg::before {
        top: 0;
        bottom: 50%;
    }

    .bg::after {
        top: 50%;
        bottom: 0;
    }

    &.alt {
        color: #aaa;
        box-shadow: inset 0 0 0 3px #aaa;
        transition: background-color 150ms ease-out;

        .bg::before,  .bg::after {
            display: none;
        }

        &:hover {
            background-color: rgba(#fff, 0.1);
        }
    }

    &:hover {
        color: #fff;

        .bg::before {
            bottom: 100%;
        }

        .bg::after {
            top: 100%;
        }
    }

    .slash {
        position: absolute;
        left: -30px;
        top: 50%;
        transform: translateY(-50%);
        width: 2px;
        height: 2px;
        background-color: #e0e0e0;
        border-radius: 50px;
        box-shadow: 0 0 3px 0 #000;
        opacity: 0;

        &.anim {
            opacity: 1;
            animation: btn-slash 400ms ease forwards;
        }
    }
}

@media (max-width: 768px) {
    .btn-slash {
        padding: 16px 24px;
    }
}

@keyframes btn-slash {
    0% {
        width: 2px;
    }
    50% {
        width: calc(100% + 60px);
        left: -30px;
    }
    100% {
        width: 0px;
        left: calc(100% + 30px);
    }
}
</style>