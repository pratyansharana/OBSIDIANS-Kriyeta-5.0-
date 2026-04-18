package com.pd.lokawaaz

import android.content.Intent
import android.os.Bundle
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.GeoPoint

class LoginActivity : AppCompatActivity() {

    private lateinit var auth: FirebaseAuth
    private lateinit var db: FirebaseFirestore

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        auth = FirebaseAuth.getInstance()
        db = FirebaseFirestore.getInstance()

        val email = findViewById<EditText>(R.id.etEmail)
        val password = findViewById<EditText>(R.id.etPassword)
        val btnLogin = findViewById<Button>(R.id.btnLogin)

        btnLogin.setOnClickListener {

            val userEmail = email.text.toString().trim()
            val userPass = password.text.toString().trim()

            if (userEmail.isEmpty() || userPass.isEmpty()) {
                Toast.makeText(this, "Enter email and password", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            // 🔐 LOGIN
            auth.signInWithEmailAndPassword(userEmail, userPass)
                .addOnCompleteListener { task ->

                    if (task.isSuccessful) {

                        val uid = auth.currentUser?.uid
                        val emailText = auth.currentUser?.email

                        if (uid == null) {
                            Toast.makeText(this, "Login error", Toast.LENGTH_SHORT).show()
                            return@addOnCompleteListener
                        }

                        // 🔥 CHECK IF DOCUMENT EXISTS
                        db.collection("field_staff")
                            .document(uid)
                            .get()
                            .addOnSuccessListener { document ->

                                if (!document.exists()) {

                                    // 🔥 CREATE NEW WORKER DOCUMENT
                                    val data = hashMapOf(
                                        "fsid" to uid,
                                        "email" to emailText,
                                        "name" to "Worker",
                                        "duty_status" to false,
                                        "assignedTask" to "",
                                        "location" to GeoPoint(0.0, 0.0)
                                    )

                                    db.collection("field_staff")
                                        .document(uid)
                                        .set(data)
                                }

                                Toast.makeText(this, "Login Successful ✅", Toast.LENGTH_SHORT).show()

                                // 🚀 MOVE TO DASHBOARD
                                startActivity(Intent(this, DashboardActivity::class.java))
                                finish()
                            }

                            .addOnFailureListener {
                                Toast.makeText(this, "Firestore Error ❌", Toast.LENGTH_SHORT).show()
                            }

                    } else {
                        Toast.makeText(this, "Invalid credentials ❌", Toast.LENGTH_SHORT).show()
                    }
                }
        }
    }
}