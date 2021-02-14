let messages_div = null;
let ctx = null;


const SCREEN_HEIGHT = 64;
const SCREEN_WIDTH = 128;

const SCALE = 8;

function main() {
    let canvas = document.getElementById("canvas");
    canvas.width = SCREEN_WIDTH * SCALE;
    canvas.height = SCREEN_HEIGHT * SCALE;

    ctx = canvas.getContext("2d");

    messages_div = document.querySelector("#messages");
    if(messages_div === null) return;

    if("serial" in navigator) {
        messages_div.innerHTML = "press connect button";
    } else {
        messages_div.innerHTML = "serial is not supported";
    }
}

async function connect() {
    let port = await navigator.serial.requestPort();
    await port.open({baudRate: 115200});

    messages_div.innerHTML = "Connected!<br/>";

    let preamble_buffer = [];
    const PREAMBLE = [0xF0, 0xE1, 0xD2, 0xC3];

    let buffer = [];

    while (port.readable) {
        const reader = port.readable.getReader();
        const writer = port.writable.getWriter();

        const encoder = new TextEncoder();

        try {
            while (true) {
                const { value, done } = await reader.read();

                if (done) {
                    break; // |reader| has been canceled.
                }

                let value_text = new TextDecoder("utf-8").decode(value);

                // console.log(value, value_text);
                console.log("get chunk");

                // naive getting welcome message
                if(value_text.substring(0, 11) === "Flipper cli") {
                    messages_div.innerHTML += value_text;
                }

                // naive getting greeting message
                if(value_text === ">: ") {
                    console.log("get greeting");
                    await writer.write(encoder.encode("screen_stream\r"));
                }

                value.forEach(x => {
                    if(buffer === null) {
                        // wait for preamble
                        preamble_buffer.push(x);

                        if(preamble_buffer.length > 4) {
                            preamble_buffer.splice(0, 1);
                        }

                        if("" + preamble_buffer === "" + PREAMBLE) {
                            console.log("found preamble!");
                            buffer = [];
                            preamble_buffer = [];
                        }
                    } else {
                        buffer.push(x);

                        if(buffer.length === 1024) {
                            console.log("get 1024 bytes, draw and clean");

                            
                            ctx.fillStyle = "#FF8B29";
                            ctx.fillRect(0, 0, SCREEN_WIDTH * SCALE, SCREEN_HEIGHT * SCALE);

                            ctx.fillStyle = "#000000";

                            for(let y = 0; y < SCREEN_HEIGHT; y++) {
                                for(let x = 0; x < SCREEN_WIDTH; x++) {
                                    let i = Math.floor(y / 8) * SCREEN_WIDTH + x;

                                    let pixel_value = buffer[i] & (1 << (y % 8));

                                    if(pixel_value !== 0) {
                                        ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
                                    }
                                }
                            }
                            

                            buffer = null;
                        }
                    }
                });
            }
        } catch (error) {
            console.error("serial error:", error);
        } finally {
            reader.releaseLock();
            writer.releaseLock();
        }
    }
}

window.onload = main;