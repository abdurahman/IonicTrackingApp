// Reference: https://devdactic.com/ionic-firebase-location-capacitor/
// https://www.youtube.com/watch?v=Sq0NbvQihrk
import { getInterpolationArgsLength } from '@angular/compiler/src/render3/view/util';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestoreCollection, AngularFirestore } from '@angular/fire/firestore';
import { map } from "rxjs/operators";
import { Plugins } from '@capacitor/core';
import { Observable } from 'rxjs';
const { Geolocation } = Plugins;
declare var google;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  locations: Observable<any>;
  locationsCollection: AngularFirestoreCollection<any>;
  user = null;
  watch = null;

  @ViewChild('map') mapElement: ElementRef;
  map: any;
  markers: [];


  isTracking = false;

  constructor(private afAuth: AngularFireAuth, private afs: AngularFirestore) {
    this.anonLogin();
  }

  ionViewWillEnter(){
    this.loadMap();
  }

  loadMap() {
    let latLng = new google.maps.LatLng(51.9036442, 7.6673267);

    let mapOptions = {
      center: latLng,
      zoom: 5,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);
  }

  anonLogin() {
    this.afAuth.signInAnonymously().then(res => {
      this.user = res.user;
      console.log(this.user);

      this.locationsCollection = this.afs.collection(
        `locations/${this.user.uid}/track`,
        ref => ref.orderBy('timestamp')
      );
      // load data from firebase
     this.locations = this.locationsCollection.snapshotChanges().pipe(
       map(actions =>
         actions.map(a => {
           const data = a.payload.doc.data();
           const id = a.payload.doc.id;
           return { id, ...data };
         })
       )
     );

      // update map
      /* this.locations.subscribe(locations => {
        console.log('new locations: ', locations);
        this.updateMap(locations);
      })
      */
    })
  }

  /*updateMap(locations) {
    this.markers.map(marker => marker.setMap(null));
    this.markers = [];

    for (let loc of locations) {
      let latLng = new google.maps.LatLng(loc.lat, loc.lng);

      let marker = new google.maps.Marker({
        position: latLng,
        animation: google.maps.Animation.DROP,
        map: this.map
      });
      this.markers.push(marker);
    }
  }
*/
  trackerStart() {
    this.isTracking = true;
    this.watch = Geolocation.watchPosition({}, (position, err) => {
      console.log('new position: ', position);
      if (position) {
        this.addNewLocation(
          position.coords.latitude,
          position.coords.longitude,
          position.timestamp
        );
      }
    });
  }

  trackerStop() {
    Geolocation.clearWatch({ id: this.watch }).then(() => {
      this.isTracking = false;
    });
  }

  addNewLocation(lat, lng, timestamp){
    this.locationsCollection.add({
      lat, lng, timestamp
    });

    let position = new google.maps.LatLng(lat, lng);
    this.map.setCenter(position);
    this.map.setZoom(5);
  }

  deleteLocation(pos){
    console.log('delete: ', pos);
    this.locationsCollection.doc(pos.id).delete();
  }
}
