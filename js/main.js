// Instantiates a map object given the 'map' HTML div element and sets the default view.
var map;
var minValue;
var dataStats = {}; 

// Instantiate a tile layer with the specified URL template.
// Alter the max zoom and inherits from Layer to add an attribution claim at the corner of the map.
function createMap(){
    //create the map
    map = L.map('map', {
        center: [41.880703, -87.6288],
        zoom: 15
    });

    //add OSM base tilelayer
    L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    //call getData function
    getData();
};

function calcMinValue(data){
    //create empty array to store all data values
    var allValues = [];
    //loop through each stop
    for(var stop of data.features){
        //loop through each year
        for(var year = 2017; year <= 2023; year+=1){
              //get number of passengers for current station
              var value = Number(stop.properties["R_"+ String(year)].replace(',',''));
              //add value to array
              allValues.push(value);
        }
    }
    //get minimum value of our array
    console.log(allValues)
    var minValue = Math.min(...allValues)

    return minValue;
}

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //constant factor adjusts symbol sizes evenly
    var minRadius = 5;
    var radius = 1.0083 * Math.pow(attValue/minValue,0.5715) * minRadius

    return radius;
};

function onEachFeature(feature, layer) {
    //no property named popupContent; instead, create html string with all properties
    var popupContent = "";
    if (feature.properties) {
        //loop to add feature property names and values to html string
        for (var property in feature.properties){
            popupContent += "<p>" + property + ": " + feature.properties[property] + "</p>";
        }
        layer.bindPopup(popupContent);
    };
};

//function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes){
    
    var attribute = attributes[0];

    //create marker options
    var options = {
        fillColor: "#ff7800",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.65
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number((feature.properties[attribute]).replace(',',''));

    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);

    //build popup content string
    var popupContent = new PopupContent(feature.properties, attribute);

    //create another popup based on the first
    var popupContent2 = Object.create(popupContent);

    popupContent2.formatted = "<h2>" + popupContent.riders + "</h2>";

    //bind the popup to the circle marker
    layer.bindPopup(popupContent.formatted,{
        offset: new L.Point(0,-Math.sqrt(options.radius))
    });

    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};

function createPropSymbols(data, attributes){
    L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);
};

function PopupContent(properties, attribute){
    this.properties = properties;
    this.attribute = attribute;
    this.year = attribute.split("_")[1];
    this.riders = this.properties[attribute];
    this.formatted = "<p><b>Station Name:</b> " + this.properties.stationname + "</p><p><b>Total July 4th passengers in " + this.year + ":</b> " + this.riders + "</p>";
};

function createPopupContent(props, attribute){
    var popupContent = "<p><b>Station Name:</b> " + props.stationname + "</p>";
    
    var year = attribute.split("_")[1];
    popupContent += "<p><b>Total July 4th passengers in " + year + ":</b> " + props[attribute] + "</p>"
    return popupContent;
}

function updatePropSymbols(attribute){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            var props = layer.feature.properties;
            console.log(props)

            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(Number(props[attribute].replace(",","")));
            layer.setRadius(radius);

            //add city to popup content string
            var popupContent = new PopupContent(props, attribute);

            //update popup with new content    
            popup = layer.getPopup();    
            popup.setContent(popupContent.formatted).update();
        };
    });
    //update the year in the legend
    var year = attribute.split("_")[1];
    document.querySelector("span.year").innerHTML = year
};

function createSequenceControls(attributes){   
    var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function () {
            // create the control container div
            var container = L.DomUtil.create('div', 'sequence-control-container');

            //create range input element (slider)
            container.insertAdjacentHTML('beforeend', '<input class="range-slider" type="range">')

            //add skip buttons
            container.insertAdjacentHTML('beforeend', '<button class="step" id="reverse" title="Reverse"><img src="img/arrow-left.png"></button>'); 
            container.insertAdjacentHTML('beforeend', '<button class="step" id="forward" title="Forward"><img src="img/arrow-right.png"></button>');

            //disable any mouse event listeners for the container
            L.DomEvent.disableClickPropagation(container);

            return container;
        }
        
    });

    map.addControl(new SequenceControl());   

    // add listeners after adding control
    document.querySelector(".range-slider").max = 6;
    document.querySelector(".range-slider").min = 0;
    document.querySelector(".range-slider").value = 0;
    document.querySelector(".range-slider").step = 1;

    document.querySelector('.range-slider').addEventListener('input', function(){
        //Step 6: get the new index value
        var index = this.value;
        console.log(index)
        updatePropSymbols(attributes[index]);
    });
    document.querySelectorAll('.step').forEach(function(step){
        step.addEventListener("click", function(){
            var index = document.querySelector('.range-slider').value;

            //Step 6: increment or decrement depending on button clicked
            if (step.id == 'forward'){
                index++;
                //Step 7: if past the last attribute, wrap around to first attribute
                index = index > 6 ? 0 : index;
            } else if (step.id == 'reverse'){
                index--;
                //Step 7: if past the first attribute, wrap around to last attribute
                index = index < 0 ? 6 : index;
            };

            //Step 8: update slider
            document.querySelector('.range-slider').value = index;
            console.log(attributes[index]);
            updatePropSymbols(attributes[index]);
        })
    })
}

function calcStats(data){
    //create empty array to store all data values
    var allValues = [];
    //loop through each city
    for(var station of data.features){
        //loop through each year
        for(var year = 2017; year <= 2023; year+=1){
              //get number of passengers for current year
              var value = station.properties["R_"+ String(year)];
              //add value to array
              allValues.push(Number(value.replace(",","")));
        }
    }
    //get min, max, mean stats for our array
    dataStats.min = Math.min(...allValues);
    dataStats.max = Math.max(...allValues);
    //calculate meanValue
    var sum = allValues.reduce(function(a, b){return a+b;});
    dataStats.mean = sum/ allValues.length;
}    

function createLegend(){

    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function () {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');

            container.innerHTML = '<h4 class="temporalLegend">Daily L-station passenger entries, July 4th <span class="year">2017</span></h4>';

            //Step 1: start attribute legend svg string
            var svg = '<svg id="attribute-legend" width="300px" height="130px">';

             //array of circle names to base loop on
            var circles = ["max", "mean", "min"];

            //Step 2: loop to add each circle and text to svg string  
            for (var i=0; i<circles.length; i++){  

                //Step 3: assign the r and cy attributes  
                var radius = calcPropRadius(dataStats[circles[i]]);  
                var cy = 130 - radius;  

                //circle string  
                svg += '<circle class="legend-circle" id="' + circles[i] + '" r="' + radius + '"cy="' + cy + '" fill="#F47821" fill-opacity="0.8" stroke="#000000" cx="65"/>';  

                //evenly space out labels            
                var textY = i * 50 + 25;            

                //text string            
                svg += '<text id="' + circles[i] + '-text" x="135" y="' + textY + '">' + Math.round(dataStats[circles[i]]*100)/100 + '</text>';
            };  

            //close svg string  
            svg += "</svg>"; 
            
            //add attribute legend svg to container
            container.insertAdjacentHTML('beforeend',svg);

            return container;
        }
    });
    map.addControl(new LegendControl());
};

function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with population values
        if (attribute.indexOf("R") > -1){
            attributes.push(attribute);
        };
    };

    return attributes;
};

//function to retrieve the data and place it on the map
function getData(){
    //load the data
    fetch("data/CTA_July4_Loop_Daily_Totals_2017-2023.geojson")
        .then(function(response){
            return response.json();
        })
        .then(function(json){
            calcStats(json); 
            var attributes = processData(json);
            //calculate minimum data value
            minValue = calcMinValue(json);
            //call function to create proportional symbols
            createPropSymbols(json, attributes);
            createSequenceControls(attributes);
            createLegend();
        })
};

document.addEventListener('DOMContentLoaded',createMap())