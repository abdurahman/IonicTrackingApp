// Reference: https://devdactic.com/ionic-firebase-location-capacitor/
// https://www.youtube.com/watch?v=Sq0NbvQihrk
import { Component, ViewChild, ElementRef } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import {
  AngularFirestore,
  AngularFirestoreCollection
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Plugins } from '@capacitor/core';
const { Geolocation } = Plugins;

declare var google;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss']
})
export class HomePage {

  locations: Observable<any>;
  locationsCollection: AngularFirestoreCollection<any>;


  @ViewChild('map') mapElement: ElementRef;
  map: any;
  markers = [];



  constructor(private afAuth: AngularFireAuth, private afs: AngularFirestore) {
    this.loginFirebase();
  }

  ionViewWillEnter() {
    this.loadingMap();
  }

  isTracking = false;
  watch: string;
  user = null;
  //login and collection creation
  loginFirebase() {
    this.afAuth.signInAnonymously().then(res => {
      this.user = res.user;

      this.locationsCollection = this.afs.collection(
        `locations/${this.user.uid}/track`,
        ref => ref.orderBy('timestamp')
      );

      this.locations = this.locationsCollection.snapshotChanges().pipe(
        map(actions =>
          actions.map(a => {
            const data = a.payload.doc.data();
            const id = a.payload.doc.id;
            return { id, ...data };
          })
        )
      );

// update to the map marker
      this.locations.subscribe(locations => {
        this.updateMap(locations);
      });
    });
  }

// map creation
  loadingMap() {
    let latLng = new google.maps.LatLng(43.640497438, -79.3749985);

    let mapOptions = {
      center: latLng,
      zoom: 5,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);
  }
  beginTrack() {
  this.isTracking = true;
  this.watch = Geolocation.watchPosition({}, (position, err) => {
    if (position) {
      this.addLocation(
        position.coords.latitude,
        position.coords.longitude,
        position.timestamp
      );
    }
  });
}

// stop trakin
stopTrack() {
  Geolocation.clearWatch({ id: this.watch }).then(() => {
    this.isTracking = false;
  });
}

// save location to firebase
addLocation(lat, lng, timestamp) {
  this.locationsCollection.add({
    lat,
    lng,
    timestamp
  });

  let position = new google.maps.LatLng(lat, lng);
  this.map.setCenter(position);
  this.map.setZoom(5);
}

// delete button
deleteLocation(pos) {
  this.locationsCollection.doc(pos.id).delete();
}


updateMap(locations) {

  this.markers.map(marker => marker.setMap(null));
  this.markers = [];

  for (let loc of locations) {
    let latLng = new google.maps.LatLng(loc.lat, loc.lng);

    let marker = new google.maps.Marker({
      map: this.map,
      animation: google.maps.Animation.DROP,
      position: latLng
    });
    this.markers.push(marker);
  }
}
}