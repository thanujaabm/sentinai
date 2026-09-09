 /* =====================================================
                 SENTIN-AI CONFIGURATION
===================================================== */

let config = {

    currentThreshold: 1.00,

    temperatureThreshold: 45,

    voltageThreshold: 3.30,

    recoveryDelay: 2000
};


/* =====================================================
                     STATE
===================================================== */

let state = {

    voltage: 3.72,

    current: 0.24,

    temperature: 31.2,

    power: 0.89,

    additionalLoad: false,

    mosfet: true,

    fault: false,

    recovery: false,

    confidence: 0
};


/* =====================================================
                  PAGE NAVIGATION
===================================================== */

function showPage(pageId, button) {

    document.querySelectorAll(".page").forEach(page => {

        page.classList.remove("active-page");

    });


    document.getElementById(pageId)
        .classList.add("active-page");


    document.querySelectorAll(".nav").forEach(nav => {

        nav.classList.remove("active");

    });


    button.classList.add("active");
}


/* =====================================================
                       CLOCK
===================================================== */

function updateClock() {

    const now = new Date();

    const time =
        now.toLocaleTimeString("en-US", {
            hour12: false
        });

    document.getElementById("clock").textContent = time;

    document.getElementById("lastContact").textContent =
        time;
}

setInterval(updateClock, 1000);


/* =====================================================
                   INA219 UPDATE
===================================================== */

function updateINA219() {

    document.getElementById("inaVoltage")
        .textContent =
        state.voltage.toFixed(2) + " V";

    document.getElementById("inaCurrent")
        .textContent =
        state.current.toFixed(2) + " A";

    document.getElementById("inaPower")
        .textContent =
        state.power.toFixed(2) + " W";


    document.getElementById("voltage")
        .textContent =
        state.voltage.toFixed(2) + " V";

    document.getElementById("current")
        .textContent =
        state.current.toFixed(2) + " A";

    document.getElementById("power")
        .textContent =
        state.power.toFixed(2) + " W";


    document.getElementById("ruleCurrent")
        .textContent =
        state.current.toFixed(2) + " A";
}


/* =====================================================
                     RULE LAYER
===================================================== */

function evaluateRuleLayer() {

    const ruleStatus =
        document.getElementById("ruleStatus");

    const condition =
        document.getElementById("ruleCondition");

    const decision =
        document.getElementById("ruleDecision");


    if (state.current > config.currentThreshold) {

        state.fault = true;

        ruleStatus.textContent =
            "FAULT CONFIRMED";

        ruleStatus.style.color =
            "#ff405c";

        condition.textContent =
            "Current > threshold";

        decision.textContent =
            "OVERCURRENT";

        addEvent(
            "Overcurrent detected",
            "FAULT",
            "INA219 current exceeded limit"
        );

        evaluateAdaptiveLayer();

    } else {

        state.fault = false;

        ruleStatus.textContent =
            "NORMAL";

        ruleStatus.style.color =
            "#00e89b";

        condition.textContent =
            "Current within limit";

        decision.textContent =
            "NO FAULT";
    }
}


/* =====================================================
                   ADAPTIVE LAYER
===================================================== */

function evaluateAdaptiveLayer() {

    const adaptiveStatus =
        document.getElementById("adaptiveStatus");

    const fault =
        document.getElementById("adaptiveFault");

    const confidence =
        document.getElementById("confidence");

    const pattern =
        document.getElementById("pattern");

    const fill =
        document.getElementById("confidenceFill");


    adaptiveStatus.textContent =
        "ANALYZING";


    /*
       Prototype adaptive confidence.

       This is only a demonstration.
       A final implementation can replace this
       with an ML/anomaly-detection model.
    */

    let value =
        Math.min(
            99,
            Math.round(
                (state.current /
                config.currentThreshold) * 50
            )
        );


    if (value < 70)
        value = 70;


    state.confidence = value;


    setTimeout(() => {

        adaptiveStatus.textContent =
            "FAULT CONFIRMED";

        adaptiveStatus.style.color =
            "#ff405c";

        fault.textContent =
            "Overcurrent";

        confidence.textContent =
            value + "%";

        fill.style.width =
            value + "%";

        pattern.textContent =
            "Persistent overload";


        document.getElementById("fdirDecision")
            .textContent =
            "ISOLATE EPS LOAD";


        document.getElementById("fdirDecision")
            .style.color =
            "#ff405c";


        addEvent(
            "Adaptive analysis complete",
            "FAULT",
            "Confidence " + value + "%"
        );


        setTimeout(startRecovery, 800);

    }, 700);
}


/* =====================================================
                   FAULT INJECTION
===================================================== */

function injectFault() {

    const type =
        document.getElementById("faultType").value;


    if (type === "overcurrent") {

        activateLoad();

    }

    else if (type === "undervoltage") {

        state.voltage = 2.80;

        state.current = 0.30;

        state.power =
            state.voltage * state.current;

        document.getElementById("simulationOutput")
            .textContent =
            "Undervoltage fault injected.";

    }

    else if (type === "overtemperature") {

        state.temperature = 55;

        document.getElementById("simulationOutput")
            .textContent =
            "Overtemperature fault injected.";

    }

    else if (type === "communication") {

        document.getElementById("esp2")
            .textContent =
            "● OFFLINE";

        document.getElementById("esp2")
            .style.color =
            "#ff405c";

        document.getElementById("simulationOutput")
            .textContent =
            "Communication loss injected.";
    }


    updateINA219();

    evaluateRuleLayer();
}


/* =====================================================
                ADDITIONAL LOAD
===================================================== */

function activateLoad() {

    state.additionalLoad = true;

    state.current = 1.80;

    state.voltage = 3.65;

    state.power =
        state.current *
        state.voltage;


    document.getElementById("loadState")
        .textContent =
        "ON";

    document.getElementById("simulationLoad")
        .textContent =
        "ON";


    document.getElementById("inaStatus")
        .textContent =
        "⚠ OVERCURRENT";

    document.getElementById("inaStatus")
        .style.color =
        "#ff405c";


    document.getElementById("currentState")
        .textContent =
        "● OVERCURRENT";


    document.getElementById("currentState")
        .style.color =
        "#ff405c";


    document.getElementById("simulationOutput")
        .textContent =
        "Additional load activated. INA219 current increased to 1.80 A.";


    updateINA219();

    evaluateRuleLayer();
}


/* =====================================================
                     RECOVERY
===================================================== */

function startRecovery() {

    if (!state.fault)
        return;


    state.recovery = true;


    document.getElementById("stepDetect")
        .classList.add("completed");


    document.getElementById("affectedSystem")
        .textContent =
        "EPS LOAD";


    document.getElementById("recoveryAction")
        .textContent =
        "ISOLATING";


    document.getElementById("fdirDecision")
        .textContent =
        "ISOLATE EPS LOAD";


    /*
       MOSFET OFF
       This represents the command that
       ESP32 #2 would send to the real MOSFET.
    */

    state.mosfet = false;


    document.getElementById("mosfetState")
        .textContent =
        "OFF";


    document.getElementById("stepDiagnose")
        .textContent =
        "② Diagnose ✓";


    document.getElementById("stepIsolate")
        .textContent =
        "③ Isolate ✓";


    document.getElementById("stepPower")
        .textContent =
        "④ Power OFF ✓";


    addEvent(
        "FDIR isolation command",
        "ACTION",
        "ESP32 #2 commanded MOSFET OFF"
    );


    setTimeout(() => {

        document.getElementById("recoveryAction")
            .textContent =
            "RESTORING POWER";

        document.getElementById("stepRestore")
            .textContent =
            "⑤ Restore ⟳";


        state.mosfet = true;

        document.getElementById("mosfetState")
            .textContent =
            "ON";


        /*
           Simulate recovered load.
        */

        state.additionalLoad = false;

        state.current = 0.24;

        state.voltage = 3.72;

        state.power =
            state.current *
            state.voltage;


        document.getElementById("loadState")
            .textContent =
            "OFF";


        updateINA219();


    }, config.recoveryDelay);


    setTimeout(() => {

        verifyRecovery();

    }, config.recoveryDelay + 700);
}


/* =====================================================
                RECOVERY VERIFICATION
===================================================== */

function verifyRecovery() {

    if (
        state.current <
        config.currentThreshold
    ) {

        document.getElementById("stepRestore")
            .textContent =
            "⑤ Restore ✓";


        document.getElementById("stepVerify")
            .textContent =
            "⑥ Verify ✓";


        document.getElementById("verificationStatus")
            .textContent =
            "RECOVERY VERIFIED ✓";


        document.getElementById("verificationStatus")
            .style.color =
            "#00e89b";


        document.getElementById("recoveryAction")
            .textContent =
            "COMPLETE";


        document.getElementById("fdirDecision")
            .textContent =
            "RETURN TO NORMAL";


        document.getElementById("fdirDecision")
            .style.color =
            "#00e89b";


        document.getElementById("inaStatus")
            .textContent =
            "● NORMAL";


        document.getElementById("inaStatus")
            .style.color =
            "#00e89b";


        document.getElementById("currentState")
            .textContent =
            "● Normal";


        document.getElementById("currentState")
            .style.color =
            "#00e89b";


        addEvent(
            "Recovery verified",
            "SUCCESS",
            "Current returned to normal"
        );


        state.fault = false;

    }

}


/* =====================================================
                    RESET SYSTEM
===================================================== */

function resetSystem() {

    state.voltage = 3.72;

    state.current = 0.24;

    state.temperature = 31.2;

    state.power = 0.89;

    state.additionalLoad = false;

    state.mosfet = true;

    state.fault = false;

    state.recovery = false;


    document.getElementById("loadState")
        .textContent =
        "OFF";

    document.getElementById("simulationLoad")
        .textContent =
        "OFF";

    document.getElementById("mosfetState")
        .textContent =
        "ON";


    document.getElementById("ruleStatus")
        .textContent =
        "NORMAL";


    document.getElementById("adaptiveStatus")
        .textContent =
        "STANDBY";


    document.getElementById("adaptiveFault")
        .textContent =
        "None";


    document.getElementById("confidence")
        .textContent =
        "0%";


    document.getElementById("confidenceFill")
        .style.width =
        "0%";


    document.getElementById("pattern")
        .textContent =
        "No anomaly";


    document.getElementById("fdirDecision")
        .textContent =
        "MONITOR";


    document.getElementById("verificationStatus")
        .textContent =
        "WAITING";


    updateINA219();


    addEvent(
        "System reset",
        "SUCCESS",
        "All parameters returned to normal"
    );
}


/* =====================================================
                      EVENT LOG
===================================================== */

function addEvent(event, status, details) {

    const table =
        document.getElementById("eventLog");


    const row =
        document.createElement("tr");


    const time =
        new Date().toLocaleTimeString(
            "en-US",
            { hour12:false }
        );


    row.innerHTML = `
        <td>${time}</td>
        <td>${event}</td>
        <td>${status}</td>
        <td>${details}</td>
    `;


    table.prepend(row);
}


/* =====================================================
                    SETTINGS
===================================================== */

function saveSettings() {

    config.currentThreshold =
        parseFloat(
            document.getElementById(
                "currentThresholdInput"
            ).value
        );


    config.recoveryDelay =
        parseInt(
            document.getElementById(
                "recoveryDelayInput"
            ).value
        ) * 1000;


    alert("FDIR settings saved.");
}


/* =====================================================
                     CHARTS
===================================================== */

const currentCtx =
    document.getElementById(
        "currentChart"
    ).getContext("2d");


const currentChart =
    new Chart(currentCtx, {

        type: "line",

        data: {

            labels: [],

            datasets: [{

                label: "Current (A)",

                data: [],

                borderWidth: 2,

                tension: 0.3
            }]
        },

        options: {

            responsive: true,

            scales: {

                y: {
                    beginAtZero: true
                }
            }
        }
    });


const faultCtx =
    document.getElementById(
        "faultChart"
    ).getContext("2d");


const faultChart =
    new Chart(faultCtx, {

        type: "bar",

        data: {

            labels: [
                "10:20",
                "10:30",
                "10:40"
            ],

            datasets: [{

                label: "Fault Events",

                data: [1, 0, 3],

                borderWidth: 1
            }]
        }
    });


function updateChart() {

    const time =
        new Date().toLocaleTimeString(
            "en-US",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );


    currentChart.data.labels.push(time);

    currentChart.data.datasets[0]
        .data.push(state.current);


    if (
        currentChart.data.labels.length >
        20
    ) {

        currentChart.data.labels.shift();

        currentChart.data.datasets[0]
            .data.shift();
    }


    currentChart.update();
}


setInterval(updateChart, 1500);


/* =====================================================
                  INITIALIZATION
===================================================== */

updateINA219();

updateClock();