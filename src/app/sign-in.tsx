import { useState } from "react";
import {Alert, Button, StyleSheet, TextInput, View} from "react-native";
import { supabase } from "@/lib/supabase";

export default function SignIn() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);

    async function signIn() {
        setBusy(true);
        const { error } = await supabase.auth.signInWithPassword({email, password});
        setBusy(false);

        if (error) {
            Alert.alert("Sign in failed", error.message);
        }
    }

    async function signUp() {
        setBusy(true);
        const { error } = await supabase.auth.signUp({email, password});
        setBusy(false);

        if (error) {
            Alert.alert("Sign up failed", error.message);
        }
    }

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
            />
            <Button title="Sign in" onPress={signIn} disabled={busy} />
            <Button title="Create account" onPress={signUp} disabled={busy} />
        </View>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
  },
});