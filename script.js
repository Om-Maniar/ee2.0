let lossVsVoltageChart, liveLossChart, lossVsTemperatureChart, efficiencyVsLoadChart, lossBreakdownChart;
let liveUpdatesEnabled = false;

// Object to store unit multipliers for each input field
const unitMultipliers = {
    primaryVoltage: 1,
    secondaryVoltage: 1,
    ratedPower: 1,
    frequency: 1,
    windingResistance: 1,
    volume: 1,
    magneticField: 1
};

// Object to store base ranges for sliders (in base units)
const baseRanges = {
    primaryVoltage: { min: 0, max: 1000, step: 0.1 },
    secondaryVoltage: { min: 0, max: 1000, step: 0.1 },
    ratedPower: { min: 0, max: 100, step: 0.1 }, // Base unit is kVA
    frequency: { min: 0, max: 100, step: 0.1 },
    windingResistance: { min: 0, max: 100, step: 1 },
    volume: { min: 0, max: 1, step: 0.01 },
    magneticField: { min: 0, max: 5, step: 0.01 }
};

function syncInputs(baseId) {
    const slider = document.getElementById(baseId + 'Slider');
    const text = document.getElementById(baseId + 'Text');
    if (event.target === slider) {
        text.value = slider.value;
    } else if (event.target === text) {
        const value = parseFloat(text.value);
        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);
        if (value < min) text.value = min;
        if (value > max) text.value = max;
        slider.value = text.value;
    }
    if (liveUpdatesEnabled) {
        calculateLosses(false);
    }
}

function updateUnit(baseId) {
    const unitSelector = document.getElementById(baseId + 'Unit');
    const multiplier = parseFloat(unitSelector.value);
    unitMultipliers[baseId] = multiplier;

    // Update slider and text input ranges based on the new unit
    const slider = document.getElementById(baseId + 'Slider');
    const text = document.getElementById(baseId + 'Text');
    const baseRange = baseRanges[baseId];

    slider.min = baseRange.min / multiplier;
    slider.max = baseRange.max / multiplier;
    slider.step = baseRange.step / multiplier;

    text.min = baseRange.min / multiplier;
    text.max = baseRange.max / multiplier;
    text.step = baseRange.step / multiplier;

    // Convert the current value to the new unit
    const currentValue = parseFloat(text.value);
    const newValue = currentValue * (unitMultipliers[baseId] / multiplier);
    text.value = newValue;
    slider.value = newValue;

    if (liveUpdatesEnabled) {
        calculateLosses(false);
    }
}

function toggleLiveUpdates() {
    liveUpdatesEnabled = document.getElementById('liveUpdateToggle').checked;
    if (liveUpdatesEnabled) {
        calculateLosses(false);
    }
}

function resetForm() {
    console.log("resetForm triggered");

    // Reset input fields to default values (in base units)
    document.getElementById('primaryVoltageSlider').value = 230;
    document.getElementById('primaryVoltageText').value = 230;
    document.getElementById('primaryVoltageUnit').value = 1;
    unitMultipliers.primaryVoltage = 1;

    document.getElementById('secondaryVoltageSlider').value = 230;
    document.getElementById('secondaryVoltageText').value = 230;
    document.getElementById('secondaryVoltageUnit').value = 1;
    unitMultipliers.secondaryVoltage = 1;

    document.getElementById('ratedPowerSlider').value = 10;
    document.getElementById('ratedPowerText').value = 10;
    document.getElementById('ratedPowerUnit').value = 1;
    unitMultipliers.ratedPower = 1;

    document.getElementById('frequencySlider').value = 50;
    document.getElementById('frequencyText').value = 50;
    document.getElementById('frequencyUnit').value = 1;
    unitMultipliers.frequency = 1;

    document.getElementById('windingResistanceSlider').value = 5;
    document.getElementById('windingResistanceText').value = 5;
    document.getElementById('windingResistanceUnit').value = 1;
    unitMultipliers.windingResistance = 1;

    document.getElementById('loadPercentageSlider').value = 50;
    document.getElementById('loadPercentageText').value = 50;

    document.getElementById('volumeSlider').value = 0.1;
    document.getElementById('volumeText').value = 0.1;
    document.getElementById('volumeUnit').value = 1;
    unitMultipliers.volume = 1;

    document.getElementById('magneticFieldSlider').value = 1.5;
    document.getElementById('magneticFieldText').value = 1.5;
    document.getElementById('magneticFieldUnit').value = 1;
    unitMultipliers.magneticField = 1;

    document.getElementById('temperatureSlider').value = 25;
    document.getElementById('temperatureText').value = 25;

    document.getElementById('coreType').value = 'crgo';
    document.getElementById('liveUpdateToggle').checked = false;
    liveUpdatesEnabled = false;

    // Reset toggles for loss impact simulator
    document.getElementById('toggleEddy').checked = true;
    document.getElementById('toggleHysteresis').checked = true;
    document.getElementById('toggleCopper').checked = true;
    document.getElementById('toggleStray').checked = true;
    document.getElementById('toggleDielectric').checked = true;

    // Reset slider ranges to base units
    Object.keys(baseRanges).forEach(baseId => {
        const slider = document.getElementById(baseId + 'Slider');
        const text = document.getElementById(baseId + 'Text');
        const range = baseRanges[baseId];
        slider.min = range.min;
        slider.max = range.max;
        slider.step = range.step;
        text.min = range.min;
        text.max = range.max;
        text.step = range.step;
    });

    clearValidationMessages();

    const fields = ['eddyLosses', 'hysteresisLosses', 'copperLosses', 'strayLosses', 'dielectricLosses', 'totalLosses', 'efficiency'];
    fields.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = '0';
            element.style.display = 'none';
            element.offsetHeight;
            element.style.display = 'inline';
        }
    });

    [lossVsVoltageChart, liveLossChart, lossVsTemperatureChart, efficiencyVsLoadChart, lossBreakdownChart].forEach(chart => {
        if (chart) chart.destroy();
    });
}

function clearValidationMessages() {
    const errorFields = [
        'primaryVoltage', 'secondaryVoltage', 'ratedPower', 'frequency',
        'windingResistance', 'loadPercentage', 'volume', 'magneticField', 'temperature'
    ];
    errorFields.forEach(field => {
        const errorElement = document.getElementById(field + 'Error');
        const textElement = document.getElementById(field + 'Text');
        if (errorElement) errorElement.textContent = '';
        if (textElement) textElement.classList.remove('invalid');
    });
}

function validateInputs(inputs) {
    const errorFields = [
        { id: 'primaryVoltage', value: inputs.primaryVoltage, message: 'Primary Voltage must be greater than 0' },
        { id: 'secondaryVoltage', value: inputs.secondaryVoltage, message: 'Secondary Voltage must be greater than 0' },
        { id: 'ratedPower', value: inputs.ratedPower, message: 'Rated Power must be greater than 0' },
        { id: 'frequency', value: inputs.frequency, message: 'Frequency must be greater than 0' },
        { id: 'windingResistance', value: inputs.windingResistance, message: 'Winding Resistance must be greater than 0' },
        { id: 'volume', value: inputs.volume, message: 'Volume must be greater than 0' },
        { id: 'magneticField', value: inputs.magneticField, message: 'Magnetic Field must be greater than 0' }
    ];

    let isValid = true;
    clearValidationMessages();

    errorFields.forEach(field => {
        if (field.value <= 0) {
            const errorElement = document.getElementById(field.id + 'Error');
            const textElement = document.getElementById(field.id + 'Text');
            if (errorElement) errorElement.textContent = field.message;
            if (textElement) textElement.classList.add('invalid');
            isValid = false;
        }
    });

    return isValid;
}

function calculateLosses(isButtonClick = false) {
    console.log("calculateLosses called, isButtonClick:", isButtonClick);

    // Get raw values and convert to base units
    const primaryVoltage = (parseFloat(document.getElementById('primaryVoltageSlider').value) || 0) * unitMultipliers.primaryVoltage;
    const secondaryVoltage = (parseFloat(document.getElementById('secondaryVoltageSlider').value) || 0) * unitMultipliers.secondaryVoltage;
    const ratedPower = (parseFloat(document.getElementById('ratedPowerSlider').value) || 0) * unitMultipliers.ratedPower * 1000; // Convert to VA
    const frequency = (parseFloat(document.getElementById('frequencySlider').value) || 0) * unitMultipliers.frequency;
    const windingResistance = (parseFloat(document.getElementById('windingResistanceSlider').value) || 0) * unitMultipliers.windingResistance;
    const loadPercentage = (parseFloat(document.getElementById('loadPercentageSlider').value) || 0) / 100;
    const volume = (parseFloat(document.getElementById('volumeSlider').value) || 0) * unitMultipliers.volume;
    const magneticField = (parseFloat(document.getElementById('magneticFieldSlider').value) || 0) * unitMultipliers.magneticField;
    const temperature = parseFloat(document.getElementById('temperatureSlider').value) || 25;
    const coreType = document.getElementById('coreType').value;

    // Get toggle states for loss impact simulator
    const toggleEddy = document.getElementById('toggleEddy').checked;
    const toggleHysteresis = document.getElementById('toggleHysteresis').checked;
    const toggleCopper = document.getElementById('toggleCopper').checked;
    const toggleStray = document.getElementById('toggleStray').checked;
    const toggleDielectric = document.getElementById('toggleDielectric').checked;

    const inputs = { primaryVoltage, secondaryVoltage, ratedPower, frequency, windingResistance, loadPercentage, volume, magneticField, temperature };
    console.log("Inputs (in base units):", inputs);

    if (isButtonClick && !validateInputs(inputs)) {
        return;
    }

    const current = (loadPercentage === 0 || secondaryVoltage === 0) ? 0 : (ratedPower / secondaryVoltage * loadPercentage);

    const kCoreEddy = coreType === 'crgo' ? 0.0005 : 0.0008;
    const kCoreHyst = coreType === 'crgo' ? 0.001 : 0.0012;

    // Calculate losses based on toggle states
    const eddyLosses = toggleEddy ? kCoreEddy * Math.pow(frequency, 2) * Math.pow(magneticField, 2) * volume : 0;
    const hysteresisLosses = toggleHysteresis ? kCoreHyst * frequency * Math.pow(magneticField, 1.6) * volume : 0;
    const tempCoefficient = 0.00393;
    const resistanceAtTemp = windingResistance * (1 + tempCoefficient * (temperature - 20));
    const copperLosses = toggleCopper ? Math.pow(current, 2) * resistanceAtTemp : 0;
    const strayLosses = toggleStray ? 0.1 * (eddyLosses + hysteresisLosses + copperLosses) : 0;
    const dielectricConstant = 0.0001;
    const dielectricLosses = toggleDielectric ? Math.pow(primaryVoltage, 2) * frequency * dielectricConstant : 0;
    const totalLosses = eddyLosses + hysteresisLosses + copperLosses + strayLosses + dielectricLosses;

    const outputPower = ratedPower * loadPercentage;
    const inputPower = outputPower + totalLosses;
    const efficiency = (inputPower === 0) ? 0 : (outputPower / inputPower) * 100;

    console.log("Calculated Values:", { eddyLosses, hysteresisLosses, copperLosses, strayLosses, dielectricLosses, totalLosses, efficiency });

    const fields = [
        { id: 'eddyLosses', value: eddyLosses },
        { id: 'hysteresisLosses', value: hysteresisLosses },
        { id: 'copperLosses', value: copperLosses },
        { id: 'strayLosses', value: strayLosses },
        { id: 'dielectricLosses', value: dielectricLosses },
        { id: 'totalLosses', value: totalLosses },
        { id: 'efficiency', value: efficiency }
    ];

    fields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element) {
            const displayValue = isNaN(field.value) ? 0 : field.value.toFixed(2);
            element.textContent = displayValue;
            console.log(`Updated ${field.id} to ${displayValue}`);
            element.style.display = 'none';
            element.offsetHeight;
            element.style.display = 'inline';
        } else {
            console.error(`Element with ID '${field.id}' not found`);
        }
    });

    if (primaryVoltage > 0 && secondaryVoltage > 0 && ratedPower > 0 && frequency > 0 && volume > 0 && magneticField > 0) {
        updateLossBreakdownChart(eddyLosses, hysteresisLosses, copperLosses, strayLosses, dielectricLosses);
        updateLossVsVoltageChart(primaryVoltage, frequency, magneticField, volume, coreType, windingResistance, loadPercentage, temperature, ratedPower);
        updateLiveLossChart(loadPercentage, totalLosses);
        updateLossVsTemperatureChart(primaryVoltage, secondaryVoltage, frequency, magneticField, volume, coreType, windingResistance, loadPercentage, ratedPower);
        updateEfficiencyVsLoadChart(primaryVoltage, secondaryVoltage, frequency, magneticField, volume, coreType, windingResistance, ratedPower, temperature);
    }
}

function calculateWithValidation() {
    console.log("calculateWithValidation triggered");
    calculateLosses(true);
}

function updateLossBreakdownChart(eddyLosses, hysteresisLosses, copperLosses, strayLosses, dielectricLosses) {
    const total = eddyLosses + hysteresisLosses + copperLosses + strayLosses + dielectricLosses;
    const data = [
        isNaN(eddyLosses) ? 0 : eddyLosses,
        isNaN(hysteresisLosses) ? 0 : hysteresisLosses,
        isNaN(copperLosses) ? 0 : copperLosses,
        isNaN(strayLosses) ? 0 : strayLosses,
        isNaN(dielectricLosses) ? 0 : dielectricLosses
    ];

    if (lossBreakdownChart) lossBreakdownChart.destroy();
    const ctx = document.getElementById('lossBreakdownChart').getContext('2d');
    lossBreakdownChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Eddy Current', 'Hysteresis', 'Copper', 'Stray', 'Dielectric'],
            datasets: [{
                data: data,
                backgroundColor: [
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                    'rgba(255, 159, 64, 0.8)',
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)'
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: { display: true, text: 'Loss Breakdown', font: { size: 16 } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(2) : 0;
                            return `${label}: ${value.toFixed(2)} W (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function updateLossVsVoltageChart(primaryVoltage, frequency, magneticField, volume, coreType, windingResistance, loadPercentage, temperature, ratedPower) {
    const voltages = [];
    const losses = [];
    const minVoltage = primaryVoltage * 0.8;
    const maxVoltage = primaryVoltage * 1.2;
    const step = (maxVoltage - minVoltage) / 20;

    for (let v = minVoltage; v <= maxVoltage; v += step) {
        voltages.push(v.toFixed(1));
        const kCoreEddy = coreType === 'crgo' ? 0.0005 : 0.0008;
        const kCoreHyst = coreType === 'crgo' ? 0.001 : 0.0012;
        const eddy = kCoreEddy * Math.pow(frequency, 2) * Math.pow(magneticField, 2) * volume;
        const hyst = kCoreHyst * frequency * Math.pow(magneticField, 1.6) * volume;
        const current = (loadPercentage === 0) ? 0 : (ratedPower / v * loadPercentage);
        const resistanceAtTemp = windingResistance * (1 + 0.00393 * (temperature - 20));
        const copper = Math.pow(current, 2) * resistanceAtTemp;
        const stray = 0.1 * (eddy + hyst + copper);
        const dielectric = Math.pow(v, 2) * frequency * 0.0001;
        const total = eddy + hyst + copper + stray + dielectric;
        losses.push(total);
    }

    if (lossVsVoltageChart) lossVsVoltageChart.destroy();
    const ctx = document.getElementById('lossVsVoltageChart').getContext('2d');
    lossVsVoltageChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: voltages,
            datasets: [{ label: 'Total Losses (W)', data: losses, borderColor: 'rgba(75, 192, 192, 1)', fill: false, tension: 0.1 }]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Total Losses vs. Voltage', font: { size: 16 } } },
            scales: { x: { title: { display: true, text: 'Voltage (V)' } }, y: { title: { display: true, text: 'Losses (W)' }, beginAtZero: true } }
        }
    });
}

function updateLiveLossChart(loadPercentage, totalLosses) {
    const loads = [0, 0.25, 0.5, 0.75, 1];
    const lossData = loads.map(load => {
        if (loadPercentage === 0 && load === 0) return totalLosses;
        return totalLosses * (load / (loadPercentage || 1));
    });

    if (liveLossChart) liveLossChart.destroy();
    liveLossChart = new Chart(document.getElementById('liveLossChart'), {
        type: 'line',
        data: {
            labels: loads.map(l => `${l * 100}%`),
            datasets: [{ label: 'Total Losses (W)', data: lossData, borderColor: 'rgba(255, 99, 132, 1)', fill: false }]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Total Losses vs. Load Percentage', font: { size: 16 } } },
            scales: { x: { title: { display: true, text: 'Load (%)' } }, y: { title: { display: true, text: 'Losses (W)' } } }
        }
    });
}

function updateLossVsTemperatureChart(primaryVoltage, secondaryVoltage, frequency, magneticField, volume, coreType, windingResistance, loadPercentage, ratedPower) {
    const temperatures = [];
    const losses = [];
    const step = 100 / 20;

    for (let t = -20; t <= 80; t += step) {
        temperatures.push(t.toFixed(1));
        const kCoreEddy = coreType === 'crgo' ? 0.0005 : 0.0008;
        const kCoreHyst = coreType === 'crgo' ? 0.001 : 0.0012;
        const eddy = kCoreEddy * Math.pow(frequency, 2) * Math.pow(magneticField, 2) * volume;
        const hyst = kCoreHyst * frequency * Math.pow(magneticField, 1.6) * volume;
        const current = (loadPercentage === 0) ? 0 : (ratedPower / secondaryVoltage * loadPercentage);
        const resistanceAtTemp = windingResistance * (1 + 0.00393 * (t - 20));
        const copper = Math.pow(current, 2) * resistanceAtTemp;
        const stray = 0.1 * (eddy + hyst + copper);
        const dielectric = Math.pow(primaryVoltage, 2) * frequency * 0.0001;
        const total = eddy + hyst + copper + stray + dielectric;
        losses.push(total);
    }

    if (lossVsTemperatureChart) lossVsTemperatureChart.destroy();
    const ctx = document.getElementById('lossVsTemperatureChart').getContext('2d');
    lossVsTemperatureChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: temperatures,
            datasets: [{ label: 'Total Losses (W)', data: losses, borderColor: 'rgba(153, 102, 255, 1)', fill: false, tension: 0.1 }]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Total Losses vs. Temperature', font: { size: 16 } } },
            scales: { x: { title: { display: true, text: 'Temperature (°C)' } }, y: { title: { display: true, text: 'Losses (W)' }, beginAtZero: true } }
        }
    });
}

function updateEfficiencyVsLoadChart(primaryVoltage, secondaryVoltage, frequency, magneticField, volume, coreType, windingResistance, ratedPower, temperature) {
    const loads = [];
    const efficiencies = [];
    const step = 0.05;

    for (let load = 0; load <= 1; load += step) {
        loads.push((load * 100).toFixed(0));
        const kCoreEddy = coreType === 'crgo' ? 0.0005 : 0.0008;
        const kCoreHyst = coreType === 'crgo' ? 0.001 : 0.0012;
        const eddy = kCoreEddy * Math.pow(frequency, 2) * Math.pow(magneticField, 2) * volume;
        const hyst = kCoreHyst * frequency * Math.pow(magneticField, 1.6) * volume;
        const current = (load === 0) ? 0 : (ratedPower / secondaryVoltage * load);
        const resistanceAtTemp = windingResistance * (1 + 0.00393 * (temperature - 20));
        const copper = Math.pow(current, 2) * resistanceAtTemp;
        const stray = 0.1 * (eddy + hyst + copper);
        const dielectric = Math.pow(primaryVoltage, 2) * frequency * 0.0001;
        const totalLosses = eddy + hyst + copper + stray + dielectric;
        const outputPower = ratedPower * load;
        const inputPower = outputPower + totalLosses;
        const efficiency = (inputPower === 0) ? 0 : (outputPower / inputPower) * 100;
        efficiencies.push(efficiency);
    }

    if (efficiencyVsLoadChart) efficiencyVsLoadChart.destroy();
    const ctx = document.getElementById('efficiencyVsLoadChart').getContext('2d');
    efficiencyVsLoadChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: loads,
            datasets: [{ label: 'Efficiency (%)', data: efficiencies, borderColor: 'rgba(255, 159, 64, 1)', fill: false, tension: 0.1 }]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Efficiency vs. Load', font: { size: 16 } } },
            scales: { x: { title: { display: true, text: 'Load (%)' } }, y: { title: { display: true, text: 'Efficiency (%)' }, min: 0, max: 100 } }
        }
    });
}

// Animated Loss Explainers
// 1. Copper Losses: Moving electrons along a wire
function animateCopperLoss() {
    const canvas = document.getElementById('copperLossAnimation');
    const ctx = canvas.getContext('2d');
    let electrons = [];
    const electronCount = 5;

    // Initialize electrons
    for (let i = 0; i < electronCount; i++) {
        electrons.push({
            x: (i * canvas.width) / (electronCount + 1),
            y: canvas.height / 2,
            speed: 1 + Math.random() * 2
        });
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw wire
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw and move electrons
        electrons.forEach(e => {
            ctx.beginPath();
            ctx.arc(e.x, e.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#00eaff';
            ctx.fill();

            e.x += e.speed;
            if (e.x > canvas.width) e.x = 0; // Loop back
        });

        requestAnimationFrame(draw);
    }
    draw();
}

// 2. Hysteresis Losses: Oscillating magnetic field
function animateHysteresisLoss() {
    const canvas = document.getElementById('hysteresisLossAnimation');
    const ctx = canvas.getContext('2d');
    let angle = 0;

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw core
        ctx.fillStyle = 'rgba(153, 102, 255, 0.5)';
        ctx.fillRect(canvas.width / 4, canvas.height / 4, canvas.width / 2, canvas.height / 2);

        // Draw oscillating magnetic field lines
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const amplitude = 20;
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x++) {
            const y = centerY + amplitude * Math.sin((x * Math.PI) / 180 + angle);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.stroke();

        angle += 0.1;
        requestAnimationFrame(draw);
    }
    draw();
}

// 3. Eddy Current Losses: Swirling currents in the core
function animateEddyLoss() {
    const canvas = document.getElementById('eddyLossAnimation');
    const ctx = canvas.getContext('2d');
    let swirls = [];
    const swirlCount = 3;

    // Initialize swirls
    for (let i = 0; i < swirlCount; i++) {
        swirls.push({
            x: canvas.width / 4 + (i * canvas.width) / 4,
            y: canvas.height / 2,
            angle: 0,
            radius: 10
        });
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw core
        ctx.fillStyle = 'rgba(75, 192, 192, 0.5)';
        ctx.fillRect(canvas.width / 4, canvas.height / 4, canvas.width / 2, canvas.height / 2);

        // Draw swirling currents
        swirls.forEach(s => {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius * Math.abs(Math.sin(s.angle)), 0, Math.PI * 2);
            ctx.strokeStyle = '#00eaff';
            ctx.lineWidth = 2;
            ctx.stroke();
            s.angle += 0.1;
        });

        requestAnimationFrame(draw);
    }
    draw();
}

// 4. Stray Losses: Random flux lines escaping the core
function animateStrayLoss() {
    const canvas = document.getElementById('strayLossAnimation');
    const ctx = canvas.getContext('2d');
    let fluxLines = [];
    const fluxCount = 5;

    // Initialize flux lines
    for (let i = 0; i < fluxCount; i++) {
        fluxLines.push({
            x: canvas.width / 2,
            y: canvas.height / 2,
            angle: (i * 2 * Math.PI) / fluxCount,
            length: 20 + Math.random() * 20
        });
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw core
        ctx.fillStyle = 'rgba(255, 99, 132, 0.5)';
        ctx.fillRect(canvas.width / 4, canvas.height / 4, canvas.width / 2, canvas.height / 2);

        // Draw escaping flux lines
        fluxLines.forEach(f => {
            const endX = f.x + Math.cos(f.angle) * f.length;
            const endY = f.y + Math.sin(f.angle) * f.length;
            ctx.beginPath();
            ctx.moveTo(f.x, f.y);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.stroke();
            f.angle += 0.05;
            f.length = 20 + 10 * Math.sin(f.angle);
        });

        requestAnimationFrame(draw);
    }
    draw();
}

// 5. Dielectric Losses: Oscillating electric field in insulation
function animateDielectricLoss() {
    const canvas = document.getElementById('dielectricLossAnimation');
    const ctx = canvas.getContext('2d');
    let angle = 0;

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw insulation material
        ctx.fillStyle = 'rgba(54, 162, 235, 0.5)';
        ctx.fillRect(canvas.width / 4, canvas.height / 4, canvas.width / 2, canvas.height / 2);

        // Draw oscillating electric field
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const amplitude = 15;
        ctx.beginPath();
        for (let y = 0; y < canvas.height; y++) {
            const x = centerX + amplitude * Math.sin((y * Math.PI) / 180 + angle);
            if (y === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#00eaff';
        ctx.lineWidth = 2;
        ctx.stroke();

        angle += 0.1;
        requestAnimationFrame(draw);
    }
    draw();
}

// Initialize animations on page load
window.onload = function() {
    animateCopperLoss();
    animateHysteresisLoss();
    animateEddyLoss();
    animateStrayLoss();
    animateDielectricLoss();
};
