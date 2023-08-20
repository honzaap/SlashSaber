<template>
    <h2 :class="{compact: props.compact}">Top slashers</h2>
    <span v-if="loading" class="loader"></span>
    <div class="leaderboard" :class="{compact: props.compact}">
        <div v-for="(item, i) in items" class="leaderboard-item"
         :class="{ first: i === 0 && !props.compact, second: i === 1 && !props.compact, third: i === 2 && !props.compact}">
            <span class="number">{{ i+1 }}.</span>
            <span class="name">{{ item.username }}</span>
            <span class="score">{{ prettifyScore(item.score) }} pts</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Ref } from "vue";
import { onMounted } from "vue";
import { ref } from "vue";
import { fetchLeaderBoard } from "../api";
import { prettifyScore } from "../helpers";
import { Settings } from "../game/models/Settings";
import { submitRun } from "../api";

const props = defineProps(["compact"]);

type LeaderBoardItem = { username : string, score : number };

const items : Ref<LeaderBoardItem[]> = ref([]);
const loading = ref(true);

onMounted(async () => {
    const leaderBoard : LeaderBoardItem[] = await fetchLeaderBoard();
    if(leaderBoard.length === 0) return;

    items.value = leaderBoard;
    loading.value = false;

    // Fetch new leaderboard every few minutes
    setInterval(async () => {
        const newLeaderBoard : LeaderBoardItem[] = await fetchLeaderBoard();
        if(newLeaderBoard.length === 0) return;

        items.value = newLeaderBoard;
    }, (props.compact ? 3 : 6) * 60 * 1000);
});


function submitNewRun(settings : Settings, score : number) {
    const existingRecord = items.value.find(i => i.username === settings.username);
    if(existingRecord && existingRecord.score < score) {
        existingRecord.score = score;
    }
    else if(!existingRecord && settings.username) {
        items.value.push({ username: settings.username, score });
    }

    items.value.sort((a, b) => b.score - a.score);
    items.value.splice(20);
    
    submitRun(settings, score);
}

defineExpose({
    submitNewRun,
});

</script>

<style lang="scss" scoped>

.loader {
    display: block;
    margin: 20px auto;
    width: 36px;
    height: 36px;
    border: 3px solid #fff;
    border-radius: 50%;
    transform-origin: center center;
    animation: loader 1000ms linear infinite;
    clip-path: polygon(0 0, 100% 0, 100% 50%, 69% 66%, 56% 100%, 0 100%);
}

@keyframes loader {
    0% {
        transform: rotateZ(0deg);
    }
    100% {
        transform: rotateZ(360deg);
    }
}

.leaderboard {
    h2 {
        font-size: 32px;
        font-family: "Bree serif";
        margin-bottom: 10px;
        text-align: center;
        letter-spacing: 3px;

        &.compact {
            font-size: 20px;
            color: rgba(#fff, 0.6);
            font-weight: 400;
            letter-spacing: 2px;
            margin-bottom: 6px;
        }
    }

    .leaderboard-item {
        display: flex;
        margin-bottom: 4px;
        max-height: 20px;
        line-height: 20px;
        --color: var(--primary);

        .number {
            display: block;
            width: 35px;
            text-align: center;
            color: #fff;
            background-color: var(--color);
            line-height: inherit;
            margin-left: 10px;
        }

        .name {
            display: block;
            width: 200px;
            color: var(--color);
            background-color: #fff;
            padding-left: 10px;
            line-height: inherit;
        }

        .score {
            display: block;
            width: 120px;
            text-align: end;
            color: #fff;
            background-color: var(--color);
            padding-right: 10px;
            line-height: inherit;
        }

        &.first, &.second, &.third {
            font-size: 20px;
            line-height: 30px;
            max-height: 30px;
            margin-bottom: 6px;

            .number {
                width: 45px;
                margin-left: 0;
                clip-path: polygon(35% 0, 100% 0, 100% 100%, 0% 100%);
                text-align: end;
                padding-right: 8px;
            }

            @media (max-width: 1400px) {
                font-size: 16px;
            }
        }

        &.first {
            --color: #EEC01D;
        }
        
        &.second {
            --color: #A8A8A8;
        }

        &.third {
            --color: #EE8517;
        }
    }

    &.compact {
        max-height: 250px;
        overflow-y: scroll;
        -ms-overflow-style: none;
        scrollbar-width: none;
        
        .number {
            color: rgba(#fff, 0.4);
            background-color: rgba(#70A480, 0.7);
        }

        .name {
            color: rgba(#70A480, 0.8);
            background-color: rgba(#fff, 0.3);
            width: 160px;
        }

        .score {
            color: rgba(#fff, 0.4);
            background-color: rgba(#70A480, 0.7);
        }

        &::-webkit-scrollbar {
            width: 0;
        }
    }

    &:not(.compact) {
        @media (max-width: 1400px) {
            .leaderboard-item {
                .name {
                    width: 150px;
                }

                .score {
                    width: 100px;
                }
            }
        }
    }

    @media (max-width: 1300px) {
        &.compact {
            position: unset;
            transform: none;
            padding: 0 10px 50px;

            .leaderboard-item {
                justify-content: center;
            }
        }
    }

    @media (max-width: 1000px) {
        &.compact {
            .leaderboard-item {
                font-size: 14px;

                .number {
                    width: 25px;
                }

                .name {
                    width: 130px;
                }

                .score {
                    width: 85px;
                }
            }
        }
    }
}
</style>