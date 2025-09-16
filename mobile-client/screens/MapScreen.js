import React, { useState } from "react";
import { View, Button, Text } from "react-native";
import axios from "axios";

const BASE_URL = "http://10.0.2.2:8000";

export default function TripScreen({ route }) {
  const { userId } = route.params;
  const [msg, setMsg] = useState("");

  const startTrip = async () => {
    try {
      const res = await axios.post(`${BASE_URL}/trip/start?user_id=${userId}`, {
        mode: "bike",
        start_lat: 22.5726,
        start_lng: 88.3639
      });
      setMsg("Trip started: " + res.data.id);
    } catch (err) {
      setMsg("Error: " + err.message);
    }
  };

  const stopTrip = async () => {
    try {
      const res = await axios.post(`${BASE_URL}/trip/stop?trip_id=1`); // for demo
      setMsg(res.data.message);
    } catch (err) {
      setMsg("Error: " + err.message);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Button title="Start Trip" onPress={startTrip}/>
      <Button title="Stop Trip" onPress={stopTrip}/>
      <Button title="Go to Map" onPress={() => {}}/>
      <Text>{msg}</Text>
    </View>
  );
}
