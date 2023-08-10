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