let lossVsVoltageChart, liveLossChart, lossVsTemperatureChart, efficiencyVsLoadChart, 
    lossBreakdownChart, lossVsFrequencyChart, lossVsCoreThicknessChart, lossVsPowerFactorChart;
let liveUpdatesEnabled = false;

// Object to store unit multipliers for each input field
const unitMultipliers = {
    primaryVoltage: 1, secondaryVoltage: 1, ratedPower: 1, frequency: 1,
    windingResistance: 1, volume: 1, magneticField: 1, corePermeability: 1,
    coreResistivity: 1, coreThickness: 1, insulationThickness: 1, ambientTemperature: 1,
    humidity: 1, powerFactor: 1, harmonicContent: 1, shortCircuitImpedance: 1,
    overloadCapacity: 1, costOfLosses: 1, maintenanceInterval: 1
};

// Object to store base ranges for sliders (in base units)
const baseRanges = {
    primaryVoltage: { min: 0, max: 1000, step: 0.1 },
    secondaryVoltage: { min: 0, max: 1000, step: 0.1 },
    ratedPower: { min: 0, max: 100, step: 0.1 },
    frequency: { min: 0, max: 100, step: 0.1 },
    windingResistance: { min: 0, max: 100, step: 1 },
    volume: { min: 0, max: 1, step: 0.01 },
    magneticField: { min: 0, max: 5, step: 0.01 },
    corePermeability: { min: 1e-4, max: 1e-2, step: 1e-5 },
    coreResistivity: { min: 1e-8, max: 1e-6, step: 1e-9 },
    coreThickness: { min: 0.1, max: 1, step: 0.01 },
    primaryTurns: { min: 10, max: 1000, step: 10 },
    secondaryTurns: { min: 10, max: 1000, step: 10 },
    insulationThickness: { min: 0.1, max: 5, step: 0.1 },
    ambientTemperature: { min: -40, max: 60, step: 1 },
    humidity: { min: 0, max: 100, step: 1 },
    powerFactor: { min: 0.8, max: 1, step: 0.01 },
    harmonicContent: { min: 0, max: 20, step: 1 },
    shortCircuitImpedance: { min: 4, max: 10, step: 0.1 },
    loadPercentage: { min: 0, max: 100, step: 1 },
    overloadCapacity: { min: 100, max: 150, step: 1 },
    costOfLosses: { min: 0.05, max: 0.5, step: 0.01 },
    maintenanceInterval: { min: 1, max: 10, step: 1 }
};

// Core constants based on material type
let coreConstants = {
    crgo: { k_eddy: 0.0005, k_hyst: 0.001, permeability: 2e-3, resistivity: 5e-7 },
    ferrite: { k_eddy: 0.0008, k_hyst: 0.0012, permeability: 1e-3, resistivity: 1e-6 },
    amorphous: { k_eddy: 0.0004, k_hyst: 0.0009, permeability: 3e-3, resistivity: 1e-6 },
    siliconSteel: { k_eddy: 0.0006, k_hyst: 0.0011, permeability: 1.5e-3, resistivity: 4e-7 }
};

function updateCoreConstants() {
    const coreType = document.getElementById('coreType').value;
    const constants = coreConstants[coreType];
    document.getElementById('corePermeabilityText').value = constants.permeability;
    document.getElementById('corePermeabilitySlider').value = constants.permeability;
    document.getElementById('coreResistivityText').value = constants.resistivity;
    document.getElementById('coreResistivitySlider').value = constants.resistivity;
    if (liveUpdatesEnabled) calculateLosses(false);
}

function syncInputs(baseId) {
    const slider = document.getElementById(baseId + 'Slider');
    const text = document.getElementById(baseId + 'Text');
    if (!slider || !text) return;

    if (event.target === slider) {
        text.value = slider.value;
    } else if (event.target === text) {
        let value = parseFloat(text.value) || 0;
        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);
        if (value < min) value = min;
        if (value > max) value = max;
        text.value = value;
        slider.value = value;
    }
    if (liveUpdatesEnabled) validateAndCalculate();
}

function updateUnit(baseId) {
    const unitSelector = document.getElementById(baseId + 'Unit');
    const multiplier = parseFloat(unitSelector.value);
    unitMultipliers[baseId] = multiplier;

    const slider = document.getElementById(baseId + 'Slider');
    const text = document.getElementById(baseId + 'Text');
    const baseRange = baseRanges[baseId];

    slider.min = baseRange.min / multiplier;
    slider.max = baseRange.max / multiplier;
    slider.step = baseRange.step / multiplier;

    text.min = baseRange.min / multiplier;
    text.max = baseRange.max / multiplier;
    text.step = baseRange.step / multiplier;

    const currentValue = parseFloat(text.value);
    const newValue = currentValue * (unitMultipliers[baseId] / multiplier);
    text.value = newValue;
    slider.value = newValue;

    if (liveUpdatesEnabled) validateAndCalculate();
}

function toggleLiveUpdates() {
    liveUpdatesEnabled = document.getElementById('liveUpdateToggle').checked;
    if (liveUpdatesEnabled) validateAndCalculate();
}

function resetForm() {
    console.log("resetForm triggered");

    document.getElementById('primaryVoltageSlider').value = 230;
    document.getElementById('primaryVoltageText').value = 230;
    document.getElementById('primaryVoltageUnit').value = 1;

    document.getElementById('secondaryVoltageSlider').value = 230;
    document.getElementById('secondaryVoltageText').value = 230;
    document.getElementById('secondaryVoltageUnit').value = 1;

    document.getElementById('ratedPowerSlider').value = 10;
    document.getElementById('ratedPowerText').value = 10;
    document.getElementById('ratedPowerUnit').value = 1;

    document.getElementById('frequencySlider').value = 50;
    document.getElementById('frequencyText').value = 50;
    document.getElementById('frequencyUnit').value = 1;

    document.getElementById('windingResistanceSlider').value = 5;
    document.getElementById('windingResistanceText').value = 5;
    document.getElementById('windingResistanceUnit').value = 1;

    document.getElementById('loadPercentageSlider').value = 50;
    document.getElementById('loadPercentageText').value = 50;

    document.getElementById('volumeSlider').value = 0.1;
    document.getElementById('volumeText').value = 0.1;
    document.getElementById('volumeUnit').value = 1;

    document.getElementById('magneticFieldSlider').value = 1.5;
    document.getElementById('magneticFieldText').value = 1.5;
    document.getElementById('magneticFieldUnit').value = 1;

    document.getElementById('temperatureSlider').value = 25;
    document.getElementById('temperatureText').value = 25;

    document.getElementById('coreType').value = 'crgo';
    updateCoreConstants();

    document.getElementById('corePermeabilitySlider').value = 2e-3;
    document.getElementById('corePermeabilityText').value = 2e-3;

    document.getElementById('coreResistivitySlider').value = 5e-7;
    document.getElementById('coreResistivityText').value = 5e-7;

    document.getElementById('coreThicknessSlider').value = 0.3;
    document.getElementById('coreThicknessText').value = 0.3;

    document.getElementById('primaryTurnsSlider').value = 100;
    document.getElementById('primaryTurnsText').value = 100;

    document.getElementById('secondaryTurnsSlider').value = 100;
    document.getElementById('secondaryTurnsText').value = 100;

    document.getElementById('insulationType').value = 'paper';
    document.getElementById('insulationThicknessSlider').value = 1;
    document.getElementById('insulationThicknessText').value = 1;

    document.getElementById('ambientTemperatureSlider').value = 25;
    document.getElementById('ambientTemperatureText').value = 25;

    document.getElementById('coolingMethod').value = 'air';
    document.getElementById('humiditySlider').value = 50;
    document.getElementById('humidityText').value = 50;

    document.getElementById('powerFactorSlider').value = 0.95;
    document.getElementById('powerFactorText').value = 0.95;

    document.getElementById('harmonicContentSlider').value = 5;
    document.getElementById('harmonicContentText').value = 5;

    document.getElementById('shortCircuitImpedanceSlider').value = 6;
    document.getElementById('shortCircuitImpedanceText').value = 6;

    document.getElementById('dutyCycle').value = 'continuous';
    document.getElementById('overloadCapacitySlider').value = 120;
    document.getElementById('overloadCapacityText').value = 120;

    document.getElementById('insulationClass').value = 'a';
    document.getElementById('costOfLossesSlider').value = 0.1;
    document.getElementById('costOfLossesText').value = 0.1;

    document.getElementById('maintenanceIntervalSlider').value = 5;
    document.getElementById('maintenanceIntervalText').value = 5;

    document.getElementById('liveUpdateToggle').checked = false;
    liveUpdatesEnabled = false;

    document.getElementById('toggleEddy').checked = true;
    document.getElementById('toggleHysteresis').checked = true;
    document.getElementById('toggleCopper').checked = true;
    document.getElementById('toggleStray').checked = true;
    document.getElementById('toggleDielectric').checked = true;

    Object.keys(baseRanges).forEach(baseId => {
        const slider = document.getElementById(baseId + 'Slider');
        const text = document.getElementById(baseId + 'Text');
        const range = baseRanges[baseId];
        if (slider) {
            slider.min = range.min;
            slider.max = range.max;
            slider.step = range.step;
        }
        if (text) {
            text.min = range.min;
            text.max = range.max;
            text.step = range.step;
        }
    });

    clearValidationMessages();
    validateAndCalculate();

    const fields = ['eddyLosses', 'hysteresisLosses', 'copperLosses', 'strayLosses', 'dielectricLosses', 'totalLosses', 'efficiency', 'annualCost'];
    fields.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = '0';
            element.style.display = 'none';
            element.offsetHeight;
            element.style.display = 'inline';
        }
    });

    [lossVsVoltageChart, liveLossChart, lossVsTemperatureChart, efficiencyVsLoadChart, 
     lossBreakdownChart, lossVsFrequencyChart, lossVsCoreThicknessChart, lossVsPowerFactorChart].forEach(chart => {
        if (chart) chart.destroy();
    });
}

function clearValidationMessages() {
    const errorFields = [
        'primaryVoltage', 'secondaryVoltage', 'ratedPower', 'frequency',
        'windingResistance', 'loadPercentage', 'volume', 'magneticField', 'temperature',
        'corePermeability', 'coreResistivity', 'coreThickness', 'primaryTurns',
        'secondaryTurns', 'insulationThickness', 'ambientTemperature', 'humidity',
        'powerFactor', 'harmonicContent', 'shortCircuitImpedance', 'overloadCapacity',
        'costOfLosses', 'maintenanceInterval'
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
        { id: 'magneticField', value: inputs.magneticField, message: 'Magnetic Field must be greater than 0' },
        { id: 'corePermeability', value: inputs.corePermeability, message: 'Core Permeability must be greater than 0' },
        { id: 'coreResistivity', value: inputs.coreResistivity, message: 'Core Resistivity must be greater than 0' },
        { id: 'coreThickness', value: inputs.coreThickness, message: 'Core Thickness must be greater than 0' },
        { id: 'primaryTurns', value: inputs.primaryTurns, message: 'Primary Turns must be greater than 0' },
        { id: 'secondaryTurns', value: inputs.secondaryTurns, message: 'Secondary Turns must be greater than 0' },
        { id: 'insulationThickness', value: inputs.insulationThickness, message: 'Insulation Thickness must be greater than 0' },
        { id: 'ambientTemperature', value: inputs.ambientTemperature, message: 'Ambient Temperature must be valid' },
        { id: 'humidity', value: inputs.humidity, message: 'Humidity must be between 0 and 100' },
        { id: 'powerFactor', value: inputs.powerFactor, message: 'Power Factor must be between 0.8 and 1' },
        { id: 'harmonicContent', value: inputs.harmonicContent, message: 'Harmonic Content must be between 0 and 20' },
        { id: 'costOfLosses', value: inputs.costOfLosses, message: 'Cost of Losses must be greater than 0' },
        { id: 'maintenanceInterval', value: inputs.maintenanceInterval, message: 'Maintenance Interval must be between 1 and 10' }
    ];

    let isValid = true;
    clearValidationMessages(); // Clear all messages before re-evaluating

    errorFields.forEach(field => {
        const errorElement = document.getElementById(field.id + 'Error');
        const textElement = document.getElementById(field.id + 'Text');
        if (!errorElement || !textElement) return;

        console.log(`Validating ${field.id}: Value = ${field.value}, Message = ${field.message}`);

        let isInvalid = false;
        if (field.value <= 0 && field.id !== 'ambientTemperature' && field.id !== 'humidity' && field.id !== 'powerFactor' && field.id !== 'harmonicContent' && field.id !== 'shortCircuitImpedance' && field.id !== 'overloadCapacity' && field.id !== 'costOfLosses' && field.id !== 'maintenanceInterval') {
            isInvalid = true;
        } else if (field.id === 'humidity' && (field.value < 0 || field.value > 100)) {
            isInvalid = true;
        } else if (field.id === 'powerFactor' && (field.value < 0.8 || field.value > 1)) {
            isInvalid = true;
        } else if (field.id === 'harmonicContent' && (field.value < 0 || field.value > 20)) {
            isInvalid = true;
        } else if (field.id === 'shortCircuitImpedance' && (field.value < 4 || field.value > 10)) {
            isInvalid = true;
        } else if (field.id === 'overloadCapacity' && (field.value < 100 || field.value > 150)) {
            isInvalid = true;
        } else if (field.id === 'maintenanceInterval' && (field.value < 1 || field.value > 10)) {
            isInvalid = true;
        } else if (field.id === 'costOfLosses' && field.value <= 0) {
            isInvalid = true;
        }

        if (isInvalid) {
            errorElement.textContent = field.message;
            textElement.classList.add('invalid');
            isValid = false;
        } else {
            textElement.classList.remove('invalid');
        }
    });

    return isValid;
}

function validateAndCalculate() {
    console.log("validateAndCalculate triggered");
    const inputs = getInputValues();
    if (validateInputs(inputs)) {
        calculateLosses(false);
    }
}

function getInputValues() {
    return {
        primaryVoltage: parseFloat(document.getElementById('primaryVoltageSlider').value) * unitMultipliers.primaryVoltage || 0,
        secondaryVoltage: parseFloat(document.getElementById('secondaryVoltageSlider').value) * unitMultipliers.secondaryVoltage || 0,
        ratedPower: parseFloat(document.getElementById('ratedPowerSlider').value) * unitMultipliers.ratedPower * 1000 || 0,
        frequency: parseFloat(document.getElementById('frequencySlider').value) * unitMultipliers.frequency || 0,
        windingResistance: parseFloat(document.getElementById('windingResistanceSlider').value) * unitMultipliers.windingResistance || 0,
        loadPercentage: parseFloat(document.getElementById('loadPercentageSlider').value) / 100 || 0,
        volume: parseFloat(document.getElementById('volumeSlider').value) * unitMultipliers.volume || 0,
        magneticField: parseFloat(document.getElementById('magneticFieldSlider').value) * unitMultipliers.magneticField || 0,
        temperature: parseFloat(document.getElementById('temperatureSlider').value) || 25,
        coreType: document.getElementById('coreType').value,
        corePermeability: parseFloat(document.getElementById('corePermeabilitySlider').value) || 2e-3,
        coreResistivity: parseFloat(document.getElementById('coreResistivitySlider').value) || 5e-7,
        coreThickness: (parseFloat(document.getElementById('coreThicknessSlider').value) || 0.3) / 1000,
        primaryTurns: parseFloat(document.getElementById('primaryTurnsSlider').value) || 100,
        secondaryTurns: parseFloat(document.getElementById('secondaryTurnsSlider').value) || 100,
        insulationType: document.getElementById('insulationType').value,
        insulationThickness: (parseFloat(document.getElementById('insulationThicknessSlider').value) || 1) / 1000,
        ambientTemperature: parseFloat(document.getElementById('ambientTemperatureSlider').value) || 25,
        coolingMethod: document.getElementById('coolingMethod').value,
        humidity: parseFloat(document.getElementById('humiditySlider').value) / 100 || 0.5,
        powerFactor: parseFloat(document.getElementById('powerFactorSlider').value) || 0.95,
        harmonicContent: parseFloat(document.getElementById('harmonicContentSlider').value) / 100 || 0.05,
        shortCircuitImpedance: parseFloat(document.getElementById('shortCircuitImpedanceSlider').value) / 100 || 0.06,
        dutyCycle: document.getElementById('dutyCycle').value,
        overloadCapacity: parseFloat(document.getElementById('overloadCapacitySlider').value) / 100 || 1.2,
        insulationClass: document.getElementById('insulationClass').value,
        costOfLosses: parseFloat(document.getElementById('costOfLossesSlider').value) || 0.1,
        maintenanceInterval: parseFloat(document.getElementById('maintenanceIntervalSlider').value) || 5
    };
}

function calculateLosses(isButtonClick = false) {
    console.log("calculateLosses called, isButtonClick:", isButtonClick);

    const inputs = getInputValues();
    console.log("Inputs:", inputs);

    // Adjust temperature based on ambient and cooling
    let effectiveTemperature = inputs.temperature;
    if (inputs.coolingMethod === 'oil') effectiveTemperature -= 5;
    else if (inputs.coolingMethod === 'forcedAir') effectiveTemperature -= 10;
    effectiveTemperature = Math.max(inputs.ambientTemperature, effectiveTemperature);

    // Calculate current with power factor and overload
    const current = (inputs.loadPercentage === 0 || inputs.secondaryVoltage === 0) ? 0 : (inputs.ratedPower * inputs.loadPercentage * inputs.overloadCapacity / (inputs.secondaryVoltage * inputs.powerFactor));

    // Adjust constants based on core properties
    const kCoreEddy = coreConstants[inputs.coreType].k_eddy * (inputs.coreThickness / 0.0003) * (1 / inputs.coreResistivity);
    const kCoreHyst = coreConstants[inputs.coreType].k_hyst * (1 / inputs.corePermeability);

    // Calculate losses
    const eddyLosses = document.getElementById('toggleEddy').checked ? kCoreEddy * Math.pow(inputs.frequency, 2) * Math.pow(inputs.magneticField, 2) * inputs.volume : 0;
    const hysteresisLosses = document.getElementById('toggleHysteresis').checked ? kCoreHyst * inputs.frequency * Math.pow(inputs.magneticField, 1.6) * inputs.volume : 0;
    const tempCoefficient = 0.00393;
    const resistanceAtTemp = inputs.windingResistance * (1 + tempCoefficient * (effectiveTemperature - 20));
    const copperLosses = document.getElementById('toggleCopper').checked ? Math.pow(current, 2) * resistanceAtTemp * (1 + inputs.harmonicContent) : 0;
    const strayLosses = document.getElementById('toggleStray').checked ? 0.1 * (eddyLosses + hysteresisLosses + copperLosses) * (1 + inputs.shortCircuitImpedance) : 0;
    const dielectricConstant = 0.0001 * (1 + inputs.humidity) * (inputs.insulationThickness / 0.001);
    const dielectricLosses = document.getElementById('toggleDielectric').checked ? Math.pow(inputs.primaryVoltage, 2) * inputs.frequency * dielectricConstant : 0;
    const totalLosses = eddyLosses + hysteresisLosses + copperLosses + strayLosses + dielectricLosses;

    // Calculate efficiency with duty cycle adjustment
    const outputPower = inputs.ratedPower * inputs.loadPercentage * (inputs.dutyCycle === 'intermittent' ? 0.9 : 1);
    const inputPower = outputPower + totalLosses;
    const efficiency = (inputPower === 0) ? 0 : (outputPower / inputPower) * 100;

    // Calculate annual cost of losses
    const annualOperatingHours = 8760 * (inputs.dutyCycle === 'intermittent' ? 0.5 : 1);
    const annualCost = (totalLosses / 1000) * (annualOperatingHours / inputs.maintenanceInterval) * inputs.costOfLosses;

    console.log("Calculated Values:", { eddyLosses, hysteresisLosses, copperLosses, strayLosses, dielectricLosses, totalLosses, efficiency, annualCost });

    const fields = [
        { id: 'eddyLosses', value: eddyLosses },
        { id: 'hysteresisLosses', value: hysteresisLosses },
        { id: 'copperLosses', value: copperLosses },
        { id: 'strayLosses', value: strayLosses },
        { id: 'dielectricLosses', value: dielectricLosses },
        { id: 'totalLosses', value: totalLosses },
        { id: 'efficiency', value: efficiency },
        { id: 'annualCost', value: annualCost }
    ];

    fields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element) {
            const displayValue = isNaN(field.value) ? 0 : field.value.toFixed(2);
            element.textContent = displayValue;
            element.style.display = 'none';
            element.offsetHeight;
            element.style.display = 'inline';
        }
    });

    if (inputs.primaryVoltage > 0 && inputs.secondaryVoltage > 0 && inputs.ratedPower > 0 && inputs.frequency > 0 && inputs.volume > 0 && inputs.magneticField > 0) {
        updateLossBreakdownChart(eddyLosses, hysteresisLosses, copperLosses, strayLosses, dielectricLosses);
        updateLossVsVoltageChart(inputs.primaryVoltage, inputs.frequency, inputs.magneticField, inputs.volume, inputs.coreType, inputs.windingResistance, inputs.loadPercentage, effectiveTemperature, inputs.ratedPower, inputs.coreThickness);
        updateLiveLossChart(inputs.loadPercentage, totalLosses);
        updateLossVsTemperatureChart(inputs.primaryVoltage, inputs.secondaryVoltage, inputs.frequency, inputs.magneticField, inputs.volume, inputs.coreType, inputs.windingResistance, inputs.loadPercentage, inputs.ratedPower, inputs.ambientTemperature, inputs.coolingMethod);
        updateEfficiencyVsLoadChart(inputs.primaryVoltage, inputs.secondaryVoltage, inputs.frequency, inputs.magneticField, inputs.volume, inputs.coreType, inputs.windingResistance, inputs.ratedPower, effectiveTemperature, inputs.powerFactor);
        updateLossVsFrequencyChart(inputs.primaryVoltage, inputs.secondaryVoltage, inputs.magneticField, inputs.volume, inputs.coreType, inputs.windingResistance, inputs.loadPercentage, inputs.ratedPower, effectiveTemperature);
        updateLossVsCoreThicknessChart(inputs.primaryVoltage, inputs.frequency, inputs.magneticField, inputs.volume, inputs.coreResistivity, inputs.coreType, inputs.windingResistance, inputs.loadPercentage, inputs.ratedPower, effectiveTemperature);
        updateLossVsPowerFactorChart(inputs.primaryVoltage, inputs.secondaryVoltage, inputs.frequency, inputs.magneticField, inputs.volume, inputs.coreType, inputs.windingResistance, inputs.loadPercentage, inputs.ratedPower, effectiveTemperature);
    }
}

function calculateWithValidation() {
    console.log("calculateWithValidation triggered");
    validateAndCalculate();
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
                    'rgba(75, 192, 192, 0.8)', 'rgba(153, 102, 255, 0.8)', 'rgba(255, 159, 64, 0.8)',
                    'rgba(255, 99, 132, 0.8)', 'rgba(54, 162, 235, 0.8)'
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)', 'rgba(153, 102, 255, 1)', 'rgba(255, 159, 64, 1)',
                    'rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)'
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

function updateLossVsVoltageChart(primaryVoltage, frequency, magneticField, volume, coreType, windingResistance, loadPercentage, temperature, ratedPower, coreThickness) {
    const voltages = [];
    const losses = [];
    const minVoltage = primaryVoltage * 0.8;
    const maxVoltage = primaryVoltage * 1.2;
    const step = (maxVoltage - minVoltage) / 20;

    for (let v = minVoltage; v <= maxVoltage; v += step) {
        voltages.push(v.toFixed(1));
        const kCoreEddy = coreConstants[coreType].k_eddy * (coreThickness / 0.0003);
        const kCoreHyst = coreConstants[coreType].k_hyst;
        const eddy = kCoreEddy * Math.pow(frequency, 2) * Math.pow(magneticField, 2) * volume;
        const hyst = kCoreHyst * frequency * Math.pow(magneticField, 1.6) * volume;
        const current = (loadPercentage === 0) ? 0 : (ratedPower * loadPercentage / v);
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

function updateLossVsTemperatureChart(primaryVoltage, secondaryVoltage, frequency, magneticField, volume, coreType, windingResistance, loadPercentage, ratedPower, ambientTemperature, coolingMethod) {
    const temperatures = [];
    const losses = [];
    const step = 100 / 20;

    for (let t = -20; t <= 80; t += step) {
        temperatures.push(t.toFixed(1));
        let effectiveTemp = t;
        if (coolingMethod === 'oil') effectiveTemp -= 5;
        else if (coolingMethod === 'forcedAir') effectiveTemp -= 10;
        effectiveTemp = Math.max(ambientTemperature, effectiveTemp);
        const kCoreEddy = coreConstants[coreType].k_eddy;
        const kCoreHyst = coreConstants[coreType].k_hyst;
        const eddy = kCoreEddy * Math.pow(frequency, 2) * Math.pow(magneticField, 2) * volume;
        const hyst = kCoreHyst * frequency * Math.pow(magneticField, 1.6) * volume;
        const current = (loadPercentage === 0) ? 0 : (ratedPower * loadPercentage / secondaryVoltage);
        const resistanceAtTemp = windingResistance * (1 + 0.00393 * (effectiveTemp - 20));
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

function updateEfficiencyVsLoadChart(primaryVoltage, secondaryVoltage, frequency, magneticField, volume, coreType, windingResistance, ratedPower, temperature, powerFactor) {
    const loads = [];
    const efficiencies = [];
    const step = 0.05;

    for (let load = 0; load <= 1; load += step) {
        loads.push((load * 100).toFixed(0));
        const kCoreEddy = coreConstants[coreType].k_eddy;
        const kCoreHyst = coreConstants[coreType].k_hyst;
        const eddy = kCoreEddy * Math.pow(frequency, 2) * Math.pow(magneticField, 2) * volume;
        const hyst = kCoreHyst * frequency * Math.pow(magneticField, 1.6) * volume;
        const current = (load === 0) ? 0 : (ratedPower * load / (secondaryVoltage * powerFactor));
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

function updateLossVsFrequencyChart(primaryVoltage, secondaryVoltage, magneticField, volume, coreType, windingResistance, loadPercentage, ratedPower, temperature) {
    const frequencies = [];
    const losses = [];
    const currentFrequency = parseFloat(document.getElementById('frequencySlider').value) * unitMultipliers.frequency;
    const minFreq = Math.max(0, currentFrequency * 0.5);
    const maxFreq = currentFrequency * 1.5;
    const step = (maxFreq - minFreq) / 20;

    for (let f = minFreq; f <= maxFreq; f += step) {
        frequencies.push(f.toFixed(1));
        const kCoreEddy = coreConstants[coreType].k_eddy;
        const kCoreHyst = coreConstants[coreType].k_hyst;
        const eddy = kCoreEddy * Math.pow(f, 2) * Math.pow(magneticField, 2) * volume;
        const hyst = kCoreHyst * f * Math.pow(magneticField, 1.6) * volume;
        const current = (loadPercentage === 0) ? 0 : (ratedPower * loadPercentage / secondaryVoltage);
        const resistanceAtTemp = windingResistance * (1 + 0.00393 * (temperature - 20));
        const copper = Math.pow(current, 2) * resistanceAtTemp;
        const stray = 0.1 * (eddy + hyst + copper);
        const dielectric = Math.pow(primaryVoltage, 2) * f * 0.0001;
        const total = eddy + hyst + copper + stray + dielectric;
        losses.push(total);
    }

    if (lossVsFrequencyChart) lossVsFrequencyChart.destroy();
    const ctx = document.getElementById('lossVsFrequencyChart').getContext('2d');
    lossVsFrequencyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: frequencies,
            datasets: [{ label: 'Total Losses (W)', data: losses, borderColor: 'rgba(54, 162, 235, 1)', fill: false, tension: 0.1 }]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Total Losses vs. Frequency', font: { size: 16 } } },
            scales: { x: { title: { display: true, text: 'Frequency (Hz)' } }, y: { title: { display: true, text: 'Losses (W)' }, beginAtZero: true } }
        }
    });
}

function updateLossVsCoreThicknessChart(primaryVoltage, frequency, magneticField, volume, coreResistivity, coreType, windingResistance, loadPercentage, ratedPower, temperature) {
    const thicknesses = [];
    const losses = [];
    const minThickness = 0.0001; // 0.1 mm in meters
    const maxThickness = 0.001; // 1 mm in meters
    const step = (maxThickness - minThickness) / 20;

    for (let t = minThickness; t <= maxThickness; t += step) {
        thicknesses.push((t * 1000).toFixed(1)); // Convert to mm
        const kCoreEddy = coreConstants[coreType].k_eddy * (t / 0.0003) * (1 / coreResistivity);
        const kCoreHyst = coreConstants[coreType].k_hyst;
        const eddy = kCoreEddy * Math.pow(frequency, 2) * Math.pow(magneticField, 2) * volume;
        const hyst = kCoreHyst * frequency * Math.pow(magneticField, 1.6) * volume;
        const current = (loadPercentage === 0) ? 0 : (ratedPower * loadPercentage / primaryVoltage);
        const resistanceAtTemp = windingResistance * (1 + 0.00393 * (temperature - 20));
        const copper = Math.pow(current, 2) * resistanceAtTemp;
        const stray = 0.1 * (eddy + hyst + copper);
        const dielectric = Math.pow(primaryVoltage, 2) * frequency * 0.0001;
        const total = eddy + hyst + copper + stray + dielectric;
        losses.push(total);
    }

    if (lossVsCoreThicknessChart) lossVsCoreThicknessChart.destroy();
    const ctx = document.getElementById('lossVsCoreThicknessChart').getContext('2d');
    lossVsCoreThicknessChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: thicknesses,
            datasets: [{ label: 'Total Losses (W)', data: losses, borderColor: 'rgba(255, 99, 132, 1)', fill: false, tension: 0.1 }]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Total Losses vs. Core Thickness', font: { size: 16 } } },
            scales: { x: { title: { display: true, text: 'Thickness (mm)' } }, y: { title: { display: true, text: 'Losses (W)' }, beginAtZero: true } }
        }
    });
}

function updateLossVsPowerFactorChart(primaryVoltage, secondaryVoltage, frequency, magneticField, volume, coreType, windingResistance, loadPercentage, ratedPower, temperature) {
    const powerFactors = [];
    const losses = [];
    const step = 0.02;

    for (let pf = 0.8; pf <= 1; pf += step) {
        powerFactors.push(pf.toFixed(2));
        const kCoreEddy = coreConstants[coreType].k_eddy;
        const kCoreHyst = coreConstants[coreType].k_hyst;
        const eddy = kCoreEddy * Math.pow(frequency, 2) * Math.pow(magneticField, 2) * volume;
        const hyst = kCoreHyst * frequency * Math.pow(magneticField, 1.6) * volume;
        const current = (loadPercentage === 0) ? 0 : (ratedPower * loadPercentage / (secondaryVoltage * pf));
        const resistanceAtTemp = windingResistance * (1 + 0.00393 * (temperature - 20));
        const copper = Math.pow(current, 2) * resistanceAtTemp;
        const stray = 0.1 * (eddy + hyst + copper);
        const dielectric = Math.pow(primaryVoltage, 2) * frequency * 0.0001;
        const total = eddy + hyst + copper + stray + dielectric;
        losses.push(total);
    }

    if (lossVsPowerFactorChart) lossVsPowerFactorChart.destroy();
    const ctx = document.getElementById('lossVsPowerFactorChart').getContext('2d');
    lossVsPowerFactorChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: powerFactors,
            datasets: [{ label: 'Total Losses (W)', data: losses, borderColor: 'rgba(54, 162, 235, 1)', fill: false, tension: 0.1 }]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Total Losses vs. Power Factor', font: { size: 16 } } },
            scales: { x: { title: { display: true, text: 'Power Factor' } }, y: { title: { display: true, text: 'Losses (W)' }, beginAtZero: true } }
        }
    });
}

// Animation Functions for Loss Explainers
function animateCopperLoss() {
    const canvas = document.getElementById('copperLossAnimation');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let x = 10;
    let y = 50;
    let direction = 1;

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw winding lines (simulating current flow)
        ctx.beginPath();
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            ctx.moveTo(10, 20 + i * 15);
            ctx.lineTo(190, 20 + i * 15);
        }
        ctx.stroke();

        // Draw moving "current" particle
        ctx.beginPath();
        ctx.fillStyle = '#ff4444';
        x += direction * 2;
        if (x > 180 || x < 10) direction *= -1;
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();

        requestAnimationFrame(draw);
    }
    draw();
}

function animateHysteresisLoss() {
    const canvas = document.getElementById('hysteresisLossAnimation');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let angle = 0;

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw core outline
        ctx.beginPath();
        ctx.strokeStyle = '#ff99ff';
        ctx.lineWidth = 2;
        ctx.rect(50, 20, 100, 60);
        ctx.stroke();

        // Draw magnetic domain flipping
        ctx.save();
        ctx.translate(100, 50);
        ctx.rotate(angle * Math.PI / 180);
        ctx.fillStyle = '#ff99ff';
        ctx.fillRect(-10, -30, 20, 60);
        ctx.restore();

        angle += 2;
        if (angle > 360) angle = 0;

        requestAnimationFrame(draw);
    }
    draw();
}

function animateEddyLoss() {
    const canvas = document.getElementById('eddyLossAnimation');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let radius = 20;
    let growing = true;

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw core outline
        ctx.beginPath();
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.rect(50, 20, 100, 60);
        ctx.stroke();

        // Draw eddy current loops
        ctx.beginPath();
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            ctx.arc(100, 50, radius + i * 15, 0, Math.PI * 2);
        }
        ctx.stroke();

        if (growing) radius += 0.5;
        else radius -= 0.5;
        if (radius > 30) growing = false;
        if (radius < 20) growing = true;

        requestAnimationFrame(draw);
    }
    draw();
}

function animateStrayLoss() {
    const canvas = document.getElementById('strayLossAnimation');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let x = 50;
    let y = 50;

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw transformer outline
        ctx.beginPath();
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.rect(40, 30, 120, 40);
        ctx.stroke();

        // Draw stray flux lines
        ctx.beginPath();
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 1;
        ctx.moveTo(x, y);
        ctx.lineTo(x + 20, y - 20);
        ctx.moveTo(x, y);
        ctx.lineTo(x - 20, y + 20);
        ctx.stroke();

        x += 0.5;
        if (x > 150) x = 50;

        requestAnimationFrame(draw);
    }
    draw();
}

function animateDielectricLoss() {
    const canvas = document.getElementById('dielectricLossAnimation');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let height = 20;

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw insulation layer
        ctx.beginPath();
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(50, 40, 100, height);
        ctx.stroke();

        height += 0.5;
        if (height > 40) height = 20;

        requestAnimationFrame(draw);
    }
    draw();
}

// Initialize Animations on Page Load
window.onload = function() {
    animateCopperLoss();
    animateHysteresisLoss();
    animateEddyLoss();
    animateStrayLoss();
    animateDielectricLoss();
    updateCoreConstants(); // Ensure this is called if defined in your main script
};
document.addEventListener("DOMContentLoaded", function() {
    // Attach event listeners to the buttons
    document.getElementById("calculateButton").addEventListener("click", calculateWithValidation);
    document.getElementById("resetButton").addEventListener("click", resetForm);
});
