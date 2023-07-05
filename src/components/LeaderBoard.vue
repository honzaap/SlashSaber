<template>
    <h2 :class="{compact: props.compact}">Top slashers</h2>
    <div class="leaderboard" :class="{compact: props.compact}">
        <div v-for="(item, i) in values" class="leaderboard-item"
         :class="{ first: i === 0 && !props.compact, second: i === 1 && !props.compact, third: i === 2 && !props.compact}">
            <span class="number">{{ i+1 }}.</span>
            <span class="name">{{ item.name }}</span>
            <span class="score">{{ prettifyScore(item.score) }} pts</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = defineProps(["compact"]);

// Placeholder values
const placeholder = [
    {
        name: "aigafafsd",
        score: 72000
    },
    {
        name: "aigafafsd",
        score: 72000
    },
    {
        name: "aigafafsd",
        score: 72000
    },
    {
        name: "aigafafsd",
        score: 72000
    },
    {
        name: "aigafafsd",
        score: 72000
    },
    {
        name: "aigafafsd",
        score: 72000
    },
    {
        name: "aigafafsd",
        score: 72000
    },
    {
        name: "aigafafsd",
        score: 72000
    },
    {
        name: "aigafafsd",
        score: 72000
    },
    {
        name: "aigafafsd",
        score: 72000
    },
    {
        name: "aigafafsd",
        score: 72000
    },
    {
        name: "aigafafsd",
        score: 72000
    },
    {
        name: "aigafafsd",
        score: 72000
    },
    {
        name: "aigafafsd",
        score: 72000
    },
    {
        name: "aigafafsd",
        score: 72000
    },
    {
        name: "aigafafsd",
        score: 72000
    },
    {
        name: "aigafafsd",
        score: 72000
    },
    {
        name: "aigafafsd",
        score: 72000
    },
    {
        name: "aigafafsd",
        score: 72000
    },
    {
        name: "aigafafsd",
        score: 72000
    }
];


const values = ref(placeholder);

function prettifyScore(score : number) {
    return score.toLocaleString("en-US");
}

</script>

<style lang="scss" scoped>

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

    @media (max-width: 1300px) {
        position: unset;
        transform: none;
        margin-top: 30px;
        padding: 0 10px 50px;

        .leaderboard-item {
            justify-content: center;
        }
    }
}
</style>