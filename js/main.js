// Instantiates a map object given the 'map' HTML div element and sets the default view.
var map;
var minValue;

// Instantiates a tile layer with the specified URL template.
// Alters the max zoom and inherits from Layer to add an attribution claim at the corner of the map.
function createMap(){
    //create the map
    map = L.map('map', {
        center: [41.90, -87.7],
        zoom: 11
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
    //loop through each city
    for(var stop of data.features){
        //loop through each year
        for(var year = 2017; year <= 2023; year+=1){
              //get population for current year
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
    //Flannery Appearance Compensation formula
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
    //Determine which attribute to visualize with proportional symbols
    
    var attribute = attributes[0];
    //check
    console.log(attribute);

    //create marker options
    var options = {
        fillColor: "#ff7800",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number((feature.properties[attribute]).replace(',',''));

    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);

    //build popup content string
    var popupContent = "<p><b>Station Name:</b> " + feature.properties.stationname + "</p><p><b>" + "7/4/2023 Total Passengers" + ":</b> " + feature.properties[attribute] + "</p>";

    //bind the popup to the circle marker
    layer.bindPopup(popupContent,{
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

function updatePropSymbols(attribute){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            var props = layer.feature.properties;
            console.log(props)

            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(Number(props[attribute].replace(",","")));
            layer.setRadius(radius);

            console.log(radius)

            //add city to popup content string
            var popupContent = "<p><b>Station Name:</b> " + props.stationname + "</p>";

            //add formatted attribute to panel content string
            var year = attribute.split("_")[1];
            popupContent += "<p><b>Total July 4th passengers in " + year + ":</b> " + props[attribute] + "</p>";

            //update popup content            
            popup = layer.getPopup();            
            popup.setContent(popupContent).update();
        };
    });
};

function createSequenceControls(attributes){
    //create range input element (slider)
    var slider = "<input class='range-slider' type='range'></input>";
    document.querySelector("#panel").insertAdjacentHTML('beforeend',slider);

    //set slider attributes
    document.querySelector(".range-slider").max = 6;
    document.querySelector(".range-slider").min = 0;
    document.querySelector(".range-slider").value = 0;
    document.querySelector(".range-slider").step = 1;

    document.querySelector('#panel').insertAdjacentHTML('beforeend','<button class="step" id="reverse">Reverse</button>');
    document.querySelector('#panel').insertAdjacentHTML('beforeend','<button class="step" id="forward">Forward</button>');

    document.querySelector('#reverse').insertAdjacentHTML('beforeend',"<img src='img/arrow-left.png'>")
    document.querySelector('#forward').insertAdjacentHTML('beforeend',"<img src='img/arrow-right.png'>")

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

    //check result
    console.log(attributes);

    return attributes;
};

//function to retrieve the data and place it on the map
function getData(){
    //load the data
    fetch("data/CTA_-_Ridership_-__L__Station_Entries_-_Daily_Totals_2017-2023.geojson")
    //fetch("data/CTA_L_Stations/CTA_RailStations-point.geojson")
        .then(function(response){
            return response.json();
        })
        .then(function(json){
            var attributes = processData(json);
            //calculate minimum data value
            minValue = calcMinValue(json);
            //console.log(minValue)
            //call function to create proportional symbols
            createPropSymbols(json, attributes);
            createSequenceControls(attributes);
        })
};

document.addEventListener('DOMContentLoaded',createMap())