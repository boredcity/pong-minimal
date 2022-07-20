const EMPTY = ' . ';
const BALL = ' ◉ ';

const PADDLE_STATE = {
    NOT_HIT: ' ▓ ',
    HIT_LEFT: '◖▓ ',
    HIT_RIGHT: ' ▓◗'
};
const PADDLE_STATES = Object.values(PADDLE_STATE);

const PADDLE_PART = {
    BOTTOM: 'BOTTOM',
    TOP: 'TOP',
    MIDDLE: 'MIDDLE'
};
const PADDLE_PARTS = Object.values(PADDLE_PART);

const CONTROLS_TYPE = {
    ARROWS: 'ARROWS',
    WASD: 'WASD',
    AI: 'AI'
};

const LS_KEY = {
    X_LENGTH: 'X_LENGTH',
    Y_LENGTH: 'Y_LENGTH',
    PADDLE_LENGTH: 'PADDLE_LENGTH',
    WINNING_SCORE: 'WINNING_SCORE',
    FRAME_TIME: 'FRAME_TIME',
    PADDLE_1: 'PADDLE_1',
    PADDLE_2: 'PADDLE_2'
};

function getPaddlePart(field, y, x, paddleLength) {
    if (!PADDLE_STATES.includes(field[y][x])) return null;

    if (paddleLength === 1) return PADDLE_PART.MIDDLE;

    for (let i = 1; i < paddleLength; i++) {
        if (field[y + i]?.[x] !== PADDLE_STATE.NOT_HIT) {
            return i === 1 ? PADDLE_PART.BOTTOM : PADDLE_PART.MIDDLE;
        }
    }

    return PADDLE_PART.TOP;
}

function useNumericLSValue(el, lsKey, fallback, min, max, restartCb) {
    const initValue = Math.max(
        min,
        Math.min(max, +(localStorage.getItem(lsKey) ?? fallback))
    );
    el.innerHTML = initValue;
    el.onkeydown = e => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        e.target.blur();
    };
    el.onblur = evt => {
        const value = evt.target.innerText.trim();
        const numValue = +value;
        if (numValue === initValue) return;
        if (!(Number.isNaN(numValue) || numValue < min || numValue > max)) {
            el.innerHTML = value;
            localStorage.setItem(lsKey, value);
            restartCb();
        } else {
            el.innerHTML = initValue;
        }
    };
    return initValue;
}

const main = () => {
    const fieldEl = document.getElementById('field');
    const scoreEl = document.getElementById('score');
    const winningScoreEl = document.getElementById('winningScore');
    const paddle1ControlsEl = document.getElementById('paddle1');
    const paddle2ControlsEl = document.getElementById('paddle2');
    const xLengthEl = document.getElementById('xLength');
    const yLengthEl = document.getElementById('yLength');
    const paddleLengthEl = document.getElementById('paddleLength');
    const frameTimeEl = document.getElementById('frameTime');

    const xLength = useNumericLSValue(
        xLengthEl,
        LS_KEY.X_LENGTH,
        20,
        5,
        50,
        restartCb
    );

    const yLength = useNumericLSValue(
        yLengthEl,
        LS_KEY.Y_LENGTH,
        15,
        5,
        50,
        restartCb
    );

    const paddleLength = useNumericLSValue(
        paddleLengthEl,
        LS_KEY.PADDLE_LENGTH,
        3,
        1,
        yLength,
        restartCb
    );

    const winningScore = useNumericLSValue(
        winningScoreEl,
        LS_KEY.WINNING_SCORE,
        5,
        1,
        99,
        restartCb
    );

    const frameTime = useNumericLSValue(
        frameTimeEl,
        LS_KEY.FRAME_TIME,
        50,
        25,
        1000,
        restartCb
    );

    let score1 = 0;
    let score2 = 0;
    let paddle1Controls = useLSValueForOptions(
        paddle1ControlsEl,
        LS_KEY.PADDLE_1,
        CONTROLS_TYPE.AI,
        restartCb
    );
    let paddle2Controls = useLSValueForOptions(
        paddle2ControlsEl,
        LS_KEY.PADDLE_2,
        CONTROLS_TYPE.AI,
        restartCb
    );

    let gameOver = false;
    updateScore();

    const renderField = field => {
        const fieldHTML = field
            .map(
                (arr, rowI) => `<div class="row" data-row-i=${rowI}>
                ${arr
                    .map(
                        (val, cellI) =>
                            `<span data-cell-i=${cellI}>${val}</span>`
                    )
                    .join('')}
            </div>`
            )
            .join('');
        fieldEl.innerHTML = fieldHTML;
    };

    const field = Array.from({ length: yLength }).map(() =>
        Array(xLength).fill(EMPTY)
    );

    const centerX = Math.floor(xLength / 2);
    const centerY = Math.floor(yLength / 2);

    renderField(field);

    const ball = new Ball({
        field,
        initialX: centerX,
        initialY: centerY,
        paddleLength
    });

    const paddles = [
        new Paddle({
            field,
            length: paddleLength,
            initialY: centerY - Math.floor(paddleLength / 2),
            x: 0,
            ball: ball,
            controlsType: paddle1Controls
        }),
        new Paddle({
            field,
            length: paddleLength,
            initialY: centerY - Math.floor(paddleLength / 2),
            x: xLength - 1,
            ball: ball,
            controlsType: paddle2Controls
        })
    ];

    function updateScore() {
        scoreEl.textContent = `${score1} : ${score2}`;
    }

    function restartCb() {
        clearInterval(intervalId);
        main();
    }

    const nextFrame = () => {
        if (gameOver) return;
        paddles.forEach(p => p.update());
        paddles.forEach(p => p.draw());
        ball.update();
        ball.draw();
        renderField(field);

        const isBallLost =
            (ball.x === 0 || ball.x === field[0].length - 1) &&
            !PADDLE_STATES.includes(field[ball.y][ball.x]);
        if (isBallLost) {
            ball.x === 0 ? score2++ : score1++;
            updateScore();
        }

        if (score1 >= winningScore || score2 >= winningScore) {
            setTimeout(() => {
                gameOver = true;
                clearInterval(intervalId);
                if (
                    confirm(`Player ${score1 > score2 ? 1 : 2} wins! Restart?`)
                ) {
                    main();
                }
            }, 0);
        }
    };

    let intervalId = setInterval(nextFrame, frameTime);
    document.onvisibilitychange = () => {
        if (document.visibilityState !== 'visible') {
            intervalId = clearInterval(intervalId);
        }
    };
    document.onkeydown = ({ key }) => {
        if (key === ' ') {
            isPaused = !!intervalId;
            intervalId = intervalId
                ? clearInterval(intervalId)
                : setInterval(nextFrame, frameTime);
        }
    };

    function useLSValueForOptions(optionsEl, lsKey, fallback, restartCb) {
        const initValue = localStorage.getItem(lsKey) ?? fallback;
        optionsEl.selectedIndex = Array.from(optionsEl.options).findIndex(
            el => el.id === initValue
        );
        optionsEl.onchange = () => {
            const value = optionsEl.options[optionsEl.selectedIndex].id;
            if (value === initValue) return;
            localStorage.setItem(lsKey, value);
            optionsEl.blur();
            restartCb();
        };
        return initValue;
    }
};

class Ball {
    get #lastXIndex() {
        return this.field[0].length - 1;
    }
    get #lastYIndex() {
        return this.field.length - 1;
    }

    constructor({
        field,
        initialX,
        initialY,
        initialDirectionX = Math.random() > 0.5 ? 1 : -1,
        initialDirectionY = Math.random() > 0.5 ? 1 : -1,
        paddleLength
    }) {
        this.field = field;
        this.field[initialY][initialX] = BALL;
        this.initialX = this.prevX = this.x = initialX;
        this.initialY = this.prevY = this.y = initialY;
        this.paddleLength = paddleLength;
        this.directionX = initialDirectionX;
        this.directionY = initialDirectionY;
    }

    getNextState = () => {
        const didHitPaddle = PADDLE_STATES.includes(this.field[this.y][this.x]);
        let directionX = this.directionX;
        let directionY = this.directionY;
        let x = this.x;
        let y = this.y;

        if (x === 0 || x === this.#lastXIndex) {
            if (didHitPaddle) {
                directionX = -directionX;
                const hitPart = getPaddlePart(
                    this.field,
                    y,
                    x,
                    this.paddleLength
                );
                switch (hitPart) {
                    case PADDLE_PART.TOP: {
                        if (directionY !== -1) directionY -= 1;
                        break;
                    }
                    case PADDLE_PART.BOTTOM: {
                        if (directionY !== 1) directionY += 1;
                        break;
                    }
                }
            } else {
                return {
                    x: this.initialX,
                    y: this.initialY,
                    directionX: Math.random() > 0.5 ? 1 : -1,
                    directionY: Math.random() > 0.5 ? 1 : -1
                };
            }
        }

        x += directionX;

        if (
            (y === 0 && directionY === -1) ||
            (y === this.#lastYIndex && directionY === 1)
        ) {
            directionY = -directionY;
        }

        y += directionY;

        return {
            x,
            y,
            directionX,
            directionY
        };
    };

    update = () => {
        const { x, y, directionX, directionY } = this.getNextState();
        this.prevX = this.x;
        this.prevY = this.y;
        this.x = x;
        this.y = y;
        this.directionX = directionX;
        this.directionY = directionY;
    };

    draw = () => {
        const prevCellContent = this.field[this.prevY][this.prevX];
        this.field[this.prevY][this.prevX] = PADDLE_STATES.includes(
            prevCellContent
        )
            ? PADDLE_STATE.NOT_HIT
            : EMPTY;

        const currentCellContent = this.field[this.y][this.x];
        if (currentCellContent === PADDLE_STATE.NOT_HIT) {
            this.field[this.y][this.x] =
                this.x === 0 ? PADDLE_STATE.HIT_RIGHT : PADDLE_STATE.HIT_LEFT;
        } else {
            this.field[this.y][this.x] = BALL;
        }
    };
}

class Paddle {
    #abortController;
    #currentStrategy;
    directionY = 0;

    get #middleY() {
        return this.y + Math.floor(this.length / 2);
    }
    get #lastY() {
        return this.y + this.length - 1;
    }

    get #maxIndex() {
        return this.field.length - this.length;
    }

    constructor({ field, length, initialY, x, controlsType, ball }) {
        this.field = field;
        this.length = length;
        this.y = initialY;
        this.prevY = initialY;
        this.x = x;
        this.ball = ball;
        this.controlsType = controlsType;

        for (let i = 0; i < length; i++) {
            field[i + initialY][x] = PADDLE_STATE.NOT_HIT;
        }

        switch (controlsType) {
            case CONTROLS_TYPE.ARROWS:
                this.#addKeyboardListeners({
                    ArrowUp: () => (this.directionY = -1),
                    ArrowDown: () => (this.directionY = 1)
                });
                break;
            case CONTROLS_TYPE.WASD:
                this.#addKeyboardListeners({
                    w: () => (this.directionY = -1),
                    s: () => (this.directionY = 1)
                });
                break;
            case CONTROLS_TYPE.AI:
                if (!this.ball) {
                    throw new Error('Ball is required for AI controls type');
                }
        }
    }

    update = () => {
        if (this.controlsType === CONTROLS_TYPE.AI) {
            this.#getDirection();
        }
        if (this.directionY !== 0) {
            this.y = Math.min(
                this.#maxIndex,
                Math.max(0, this.y + this.directionY)
            );
            this.directionY = 0;
        }
    };

    reset = () => (this.y = this.initialY);

    draw = () => {
        for (let i = 0; i < this.field.length; i++) {
            if (i < this.y || i > this.y + this.length - 1) {
                this.field[i][this.x] = EMPTY;
            } else {
                this.field[i][this.x] = PADDLE_STATE.NOT_HIT;
            }
        }
    };

    removeKeyboardListeners() {
        this.#abortController?.abort();
    }

    #addKeyboardListeners(controlHandlers) {
        this.removeKeyboardListeners();
        this.#abortController = new AbortController();
        document.addEventListener(
            'keydown',
            evt => {
                console.log('keydown', evt.key);
                controlHandlers[evt.key]?.(true);
            },
            {
                signal: this.#abortController.signal
            }
        );
    }

    #getDirection() {
        const {
            y: ballY,
            x: ballX,
            directionX: ballDirectionX
        } = this.ball.getNextState();

        const ballIsComing =
            (ballX <= this.x && ballDirectionX === 1) ||
            (ballX >= this.x && ballDirectionX === -1);

        if (!ballIsComing) {
            this.#currentStrategy = null;
        } else if (!this.#currentStrategy) {
            this.#currentStrategy =
                PADDLE_PARTS[Math.floor(Math.random() * PADDLE_PARTS.length)];
        }

        switch (this.#currentStrategy) {
            case PADDLE_PART.TOP: {
                if (ballY !== this.y) {
                    this.directionY = ballY > this.y ? 1 : -1;
                }
                break;
            }
            case PADDLE_PART.MIDDLE: {
                if (ballY <= this.y || ballY >= this.#lastY) {
                    this.directionY = ballY >= this.#lastY ? 1 : -1;
                }
                break;
            }
            case PADDLE_PART.BOTTOM: {
                if (ballY !== this.#lastY) {
                    this.directionY = ballY > this.#lastY ? 1 : -1;
                }
                break;
            }
        }
    }
}

main();
