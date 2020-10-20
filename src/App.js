
import React from 'react';
import texasCountyGeoJSON from './cb_2019_us/cb_2019_us_county_20m.geojson';
import electionStyle from './light-google-map-style.json';
import Tabletop from 'tabletop';
import {isMobile} from 'react-device-detect';

var earlyVoteDict = null;

const formStyle = {
  width: '100%',
  textAlign: 'center',
};

const mapStyle = {
  height: isMobile ? '480px' : '640px',
  width: '100%',
};



class Map extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      map: null,
      googleData: null,
      buildDictNotDone: true,
      selectUpdate: true,
      selectedOption: 'votes',
      mapHasSelected: false,
      mapHasMouseOver: false,
      currentSelection: '',
      selectedCountyList: [],
      updatedDate: '',
      texasInfo: {},
      texasInfoNotDone: true,
    }
  }

  getGoogleMaps() {
    // If we haven't already defined the promise, define it
    if (!this.googleMapsPromise) {
      this.googleMapsPromise = new Promise((resolve) => {
        // Add a global handler for when the API finishes loading
        window.resolveGoogleMapsPromise = () => {
          // Resolve the promise
          const google = window.google;
          resolve(google);
          // Tidy up
          delete window.resolveGoogleMapsPromise;
        };

        // Load the Google Maps API
        var script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_API_KEY}&callback=resolveGoogleMapsPromise`;
        script.async = true;
        document.body.appendChild(script);
      });
    }

    // Return a promise for the Google Maps API
    return this.googleMapsPromise;
  }

  componentWillMount() {
    Tabletop.init({
      key: process.env.REACT_APP_GOOGLE_SHEETS_KEY,
      wanted: ['Sheet1'],
      callback: googleData => {
        this.setState({ googleData: googleData }); 
      },
      simpleSheet: true,
    });
    this.getGoogleMaps();
  }

  componentDidMount() {
    this.getGoogleMaps().then((google) => {

      var location = {lat: 30.9686, lng:-99.9018};

      let map: google.maps.Map;

      var electionStyledMapType = new google.maps.StyledMapType (electionStyle, {name: 'Texas County Map'});

      var zoom = isMobile ? 5 : 6;

      var mapOptions = {
        zoom: zoom, 
        minZoom: zoom,
        //maxZoom: zoom,
        center: location,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: false,
        //draggable: false, 
        //scrollwheel: false, 
        disableDoubleClickZoom: true,
        //gestureHandling: 'none',
        mapTypeControl: false,
        styled: electionStyle,
      };

      map = new google.maps.Map(document.getElementById('map'), mapOptions);
      map.mapTypes.set('texas_county_map', electionStyledMapType);
      map.setMapTypeId('texas_county_map');
      //map.addListener("dragend", (event) => {
      //  map.setCenter(location); 
      //});
      map.data.loadGeoJson(texasCountyGeoJSON);
      map.data.setStyle(function(feature) {
        feature.setProperty("isSelected", false); 
      });

    map.data.addListener("click", (event) => {
      const { selectedCountyList } = this.state;
      var updatedList = [...selectedCountyList];
      const isSelected = event.feature.getProperty("isSelected");
      if(isSelected === false) {
        event.feature.setProperty("isSelected", true);
        map.data.setStyle(event.feature, {strokeWeight: 4});
        const name = event.feature.getProperty("NAME");
        const countyString = name + " County, ";
        const votes = earlyVoteDict[name.toLowerCase()].votes;
        const numVotes = Number(votes.replace(/,/g,''));
        const voteString = countyString + votes + ' votes';
        const registered = earlyVoteDict[name.toLowerCase()].registered;
        const numRegistered = Number(registered.replace(/,/g,''));
        const registeredString = voteString + ' out of ' + registered + ' registered, ' + parseFloat((parseFloat(numVotes/numRegistered)*100)).toFixed(1)+"%";
        const turnout2016 = earlyVoteDict[name.toLowerCase()].turnout2016;
        const numTurnout2016 = Number(turnout2016.replace(/,/g,''));
        const turnoutString = voteString + ' out of ' + turnout2016 + ' votes in 2016, ' + parseFloat((parseFloat(numVotes/numTurnout2016)*100)).toFixed(1)+"%";
        var currentCountyInfo = {
          voteString: voteString,
          registeredString: registeredString,
          turnoutString: turnoutString,
          name: name,
          numVotes: numVotes, 
          numRegistered: numRegistered,
          numTurnout2016: numTurnout2016
        }
        updatedList.push(currentCountyInfo);
        this.setState({ mapHasSelected: true, selectedCountyList: updatedList });
      } else {
        const name = event.feature.getProperty("NAME");
        event.feature.setProperty("isSelected", false);
        map.data.setStyle(event.feature, {strokeWeight: 1.5});
        this.removeCounty(name); 
      }
    });

    map.data.addListener("mouseover", (event) => {
      const { selectedOption, selectedCountyList } = this.state;
      var updatedList = [...selectedCountyList];
      map.data.overrideStyle(event.feature, {strokeWeight: 4});
      const name = event.feature.getProperty("NAME");
      const countyString = name + " County, ";
      const votes = earlyVoteDict[name.toLowerCase()].votes;
      const numVotes = Number(votes.replace(/,/g,''));
      const voteString = countyString + votes + ' votes';
      const registered = earlyVoteDict[name.toLowerCase()].registered;
      const numRegistered = Number(registered.replace(/,/g,''));
      const registeredString = voteString + ' out of ' + registered + ' registered, ' + parseFloat((parseFloat(numVotes/numRegistered)*100)).toFixed(1)+"%";
      const turnout2016 = earlyVoteDict[name.toLowerCase()].turnout2016;
      const numTurnout2016 = Number(turnout2016.replace(/,/g,''));
      const turnoutString = voteString + ' out of ' + turnout2016 + ' votes in 2016, ' + parseFloat((parseFloat(numVotes/numTurnout2016)*100)).toFixed(1)+"%";
      var displayValue;
      if(selectedOption === 'votes') {
        displayValue = voteString;
      } else if(selectedOption === 'registered') {
        displayValue = registeredString;
      } else if(selectedOption === 'turnout2016') {
        displayValue = turnoutString;
      }
      this.setState({ mapHasMouseOver: true, currentInfo: displayValue });
    });

    map.data.addListener("mouseout", (event) => {
      if(event.feature.getProperty("isSelected") === false){
        map.data.revertStyle(event.feature);
      }
      this.setState({ mapHasMouseOver: false });
    });

      this.setState({ map: map });
    });
  }

  getTexasInfo() {
    var texasInfo = {};
    console.log('total numbers');
    const name = 'total';
    const countyString = "State of Texas, ";
    const votes = earlyVoteDict[name.toLowerCase()].votes;
    const numVotes = Number(votes.replace(/,/g,''));
    const voteString = countyString + votes + ' votes';
    const registered = earlyVoteDict[name.toLowerCase()].registered;
    const numRegistered = Number(registered.replace(/,/g,''));
    const registeredString = voteString + ' out of ' + registered + ' registered, ' + parseFloat((parseFloat(numVotes/numRegistered)*100)).toFixed(1)+"%";
    const turnout2016 = earlyVoteDict[name.toLowerCase()].turnout2016;
    const numTurnout2016 = Number(turnout2016.replace(/,/g,''));
    const turnoutString = voteString + ' out of ' + turnout2016 + ' votes in 2016, ' + parseFloat((parseFloat(numVotes/numTurnout2016)*100)).toFixed(1)+"%";
    texasInfo = {
      voteString: voteString,
      registeredString: registeredString,
      turnoutString: turnoutString,
      name: name,
      numVotes: numVotes, 
      numRegistered: numRegistered,
      numTurnout2016: numTurnout2016
    }
    console.log(texasInfo);
    this.setState({ texasInfoNotDone: false, texasInfo: texasInfo }); 
  }

  buildDictionary() {
    const { map, googleData } = this.state;
    earlyVoteDict = {}; 
    var updatedDate = '';
    googleData.map(function(row) {
      earlyVoteDict[row.County.toLowerCase()] = { votes: row['Cumulative In-Person And Mail Voters'], registered: row['Registered Voters'], turnout2016: row['2016 Total Turnout'] };
      if(row.County.toLowerCase() === 'anderson') {
        updatedDate = row['Updated Date'];
      }
    });
    this.setState({ buildDictNotDone: false, updatedDate: updatedDate }); 
  }

  renderCountyList() {
    var {selectedOption, selectedCountyList} = this.state;
    const countyList = [...selectedCountyList];
    var displayIndex;
    if(selectedOption === 'votes') {
      displayIndex = 'voteString';
    } else if(selectedOption === 'registered') {
      displayIndex = 'registeredString';
    } else if(selectedOption === 'turnout2016') {
      displayIndex = 'turnoutString';
    }
    return (
      countyList.map((county, index) => (
        <p id={index}>{county[displayIndex]}</p>
      )
    ));
  }
  
  renderTexasInfo() {
    var { selectedOption, texasInfo } = this.state;
    const voteIndex = 'numVotes';
    var denominatorIndex;
    var totalVotes=0;
    var denominatorTotal=0;
    if(selectedOption === 'votes') {
      //return vote totals
    } else if(selectedOption === 'registered') {
      denominatorIndex = 'numRegistered';
    } else if(selectedOption === 'turnout2016') {
      denominatorIndex = 'numTurnout2016';
    }
    totalVotes += texasInfo[voteIndex];
    denominatorTotal += texasInfo[denominatorIndex];
    const voteString = "State of Texas: " + totalVotes.toLocaleString('en') + ' votes';
    var displayString;
    if(selectedOption === 'votes') {
      displayString = voteString;
    } else if(selectedOption === 'registered') {
      displayString = voteString + ' out of ' + denominatorTotal.toLocaleString('en') + ' registered, ' + parseFloat((parseFloat(totalVotes/denominatorTotal)*100)).toFixed(1)+"%";
    } else if(selectedOption === 'turnout2016') {
      displayString = voteString + ' out of ' + denominatorTotal.toLocaleString('en') + ' votes in 2016, ' + parseFloat((parseFloat(totalVotes/denominatorTotal)*100)).toFixed(1)+"%";
    }
    return (
      <h4 style={formStyle}>{displayString}</h4>
    );
  }

  renderTotals() {
    var { selectedOption, selectedCountyList } = this.state;
    const countyList = [...selectedCountyList];
    const voteIndex = 'numVotes';
    var denominatorIndex;
    var totalVotes=0;
    var denominatorTotal=0;
    if(selectedOption === 'votes') {
      //return vote totals
    } else if(selectedOption === 'registered') {
      denominatorIndex = 'numRegistered';
    } else if(selectedOption === 'turnout2016') {
      denominatorIndex = 'numTurnout2016';
    }
    countyList.map(function(county) {
      totalVotes += county[voteIndex];
      denominatorTotal += county[denominatorIndex];
    });
    const voteString = "Combined Results: " + totalVotes.toLocaleString('en') + ' votes';
    var displayString;
    if(selectedOption === 'votes') {
      //return vote totals
      displayString = voteString;
    } else if(selectedOption === 'registered') {
      displayString = voteString + ' out of ' + denominatorTotal.toLocaleString('en') + ' registered, ' + parseFloat((parseFloat(totalVotes/denominatorTotal)*100)).toFixed(1)+"%";
    } else if(selectedOption === 'turnout2016') {
      displayString = voteString + ' out of ' + denominatorTotal.toLocaleString('en') + ' votes in 2016, ' + parseFloat((parseFloat(totalVotes/denominatorTotal)*100)).toFixed(1)+"%";
    }
    return (
      <h4 style={formStyle}>{displayString}</h4>
    );
  }

  removeCounty(countyName) {
    const { selectedCountyList } = this.state;
    var countyList = [...selectedCountyList];
    var updatedList = []; 
    countyList.map(function(county) {
      if(county.name !== countyName) {
        updatedList.push(county);
      }
    });
    this.setState({ selectedCountyList: updatedList });
  }


  fillInMap() {
    const { map, selectedOption, selectedCountyList } = this.state;
    var updatedList = [...selectedCountyList];
    map.data.setStyle(function(feature) {
      var name = feature.getProperty('NAME');
      var denominator;
      if(selectedOption === 'votes') {
        denominator = 1000000;
      } else if(selectedOption === 'registered') {
        denominator = Number(earlyVoteDict[name.toLowerCase()].registered.replace(/,/g,''));
      } else if(selectedOption === 'turnout2016') {
        denominator = Number(earlyVoteDict[name.toLowerCase()].turnout2016.replace(/,/g,''));
      }
      var numerator = Number(earlyVoteDict[name.toLowerCase()].votes.replace(/,/g,''));
      var percentage = parseFloat(100 - (parseFloat(numerator/denominator)*80)).toFixed(0)+"%";
      var color = "hsl(240, 100%," + percentage + ")";
      return {
        fillColor: color,
        strokeWeight: 1.5,  
        fillOpacity: 1.0,
      }
    });
  }

  handleOptionChange(event) {
    const selectedOption = event.target.value;
    this.setState({ selectedOption: selectedOption });
  }
  componentDidUpdate() {
    const { googleData, buildDictNotDone, texasInfoNotDone } = this.state;
    if(googleData) {
      if (googleData.length === 255) {
        if(buildDictNotDone) {
          this.buildDictionary(); 
        }
        if(texasInfoNotDone) {
          this.getTexasInfo();
        }
        this.fillInMap();
      }
    }
  }

 calculateCountdown(endDate) {
    let diff = (Date.parse(new Date(endDate)) - Date.parse(new Date())) / 1000;

    // clear countdown when date is reached
    if (diff <= 0) return false;

    const timeLeft = {
      years: 0,
      days: 0,
      hours: 0,
      min: 0,
      sec: 0,
      millisec: 0,
    };

    // calculate time difference between now and expected date
    if (diff >= (365.25 * 86400)) { // 365.25 * 24 * 60 * 60
      timeLeft.years = Math.floor(diff / (365.25 * 86400));
      diff -= timeLeft.years * 365.25 * 86400;
    }
    if (diff >= 86400) { // 24 * 60 * 60
      timeLeft.days = Math.floor(diff / 86400);
      diff -= timeLeft.days * 86400;
    }
    if (diff >= 3600) { // 60 * 60
      timeLeft.hours = Math.floor(diff / 3600);
      diff -= timeLeft.hours * 3600;
    }
    if (diff >= 60) {
      timeLeft.min = Math.floor(diff / 60);
      diff -= timeLeft.min * 60;
    }
    timeLeft.sec = diff;

    return timeLeft;
  }

  render () {
    const { map, selectedOption, mapHasMouseOver, mapHasSelected, currentInfo, selectedCountyList, updatedDate, texasInfoNotDone } = this.state;
    var electionDay = new Date(2020, 10, 3); 
    var timeLeft = this.calculateCountdown(electionDay); 
    return (
      <div id="map-container">
        <h1 style={formStyle} >Early Voting Data for Texas Counties</h1>
        <h4 style={formStyle} >There are {timeLeft.days + 1} days left until Election Day</h4>
        <div id="form" style={formStyle} className="form">
          <form>
            <div onChange={this.handleOptionChange.bind(this)} className="form-check">
              <label htmlFor="totalVotes">
                <input
                  id="totalVotes"
                  type="radio"
                  name="totalVotes"
                  value="votes"
                  checked={selectedOption === 'votes'}
                  onChange={this.handleOptionChange.bind(this)}
                  className="form-check-input"
                />
                Total mail-in and in-person votes
              </label>
            </div>
            <div onChange={this.handleOptionChange.bind(this)} className="form-check">
              <label htmlFor="percentageRegistered">
                <input
                  id="facility-label"
                  type="radio"
                  name="percentageRegistered"
                  value="registered"
                  checked={selectedOption === 'registered'}
                  onChange={this.handleOptionChange.bind(this)}
                  className="form-check-input"
                />
                Votes as percentage of registered voters
              </label>
            </div>
            <div></div>
            <div onChange={this.handleOptionChange.bind(this)} className="form-check">
              <label htmlFor="percentage2016">
                <input
                  id="percentage2016"
                  type="radio"
                  name="percentage2016"
                  value="turnout2016"
                  checked={selectedOption === 'turnout2016'}
                  onChange={this.handleOptionChange.bind(this)}
                  className="form-check-input"
                />
                Votes as percentatge of 2016 turnout
              </label>
            </div>
          </form>
        </div>
        <div id="map" style={mapStyle} className="map"></div>
        { mapHasMouseOver ? (
          <div id="selected-counties">
            <h4 style={formStyle}>{currentInfo}</h4>
          </div>
        ) : (
          <div id="selected-counties">
            <h4 style={formStyle}> </h4>
          </div>
        )}
        { (mapHasSelected && selectedCountyList.length) ? ( 
          <div id="selected-counties" style={formStyle}> 
          {this.renderCountyList()}
            { (selectedCountyList.length > 1) ? this.renderTotals() : null }
          </div>
        ) : ( 
          <div id="selected-counties">
            <h4 style={formStyle}> </h4>
          </div>
        )}
        { texasInfoNotDone ? (
          <div id="selected-counties">
            <h4 style={formStyle}> </h4>
          </div>
        ) : (
          <div id="selected-counties" style={formStyle}> 
          {this.renderTexasInfo()}
          </div>
        )}
        <div id="updated-date" style={formStyle} className="updated-date">
          <p>Updated as of {updatedDate}.</p>
        </div>
        <div id="data" style={formStyle} className="data">
          <p>The data used for this project was made available by the Texas Secretary of State:</p>
          <p><a href="https://earlyvoting.texas-election.com/Elections/getElectionDetails.do">https://earlyvoting.texas-election.com/Elections/getElectionDetails.do</a></p>
        </div>
      </div>
    );
  }
}

export default Map;
