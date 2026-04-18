package com.pd.lokawaaz

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.FileProvider
import com.bumptech.glide.Glide
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.GeoPoint
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.storage.FirebaseStorage
import com.google.android.gms.maps.*
import com.google.android.gms.maps.model.*
import com.google.android.gms.location.*
import java.io.File

class DashboardActivity : AppCompatActivity(), OnMapReadyCallback {

    private lateinit var db: FirebaseFirestore
    private lateinit var auth: FirebaseAuth

    private var selectedImageUri: Uri? = null
    private var imageUri: Uri? = null
    private var currentRid: String? = null

    private lateinit var imgPothole: ImageView
    private lateinit var txtDescription: TextView
    private lateinit var txtTask: TextView
    private lateinit var btnCaptureImage: Button
    private lateinit var btnSubmit: Button
    private lateinit var switchDuty: Switch
    private lateinit var imgProfile: ImageView

    private lateinit var mMap: GoogleMap
    private lateinit var fusedLocationClient: FusedLocationProviderClient

    private lateinit var locationCallback: LocationCallback
    private var workerMarker: Marker? = null

    // 🔥 NEW: real-time listener
    private var taskListener: ListenerRegistration? = null

    private val cameraLauncher = registerForActivityResult(
        ActivityResultContracts.TakePicture()
    ) { success ->
        if (success) {
            imgPothole.setImageURI(imageUri)
            selectedImageUri = imageUri
            Toast.makeText(this, "Photo Captured ✅", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_dashboard)

        db = FirebaseFirestore.getInstance()
        auth = FirebaseAuth.getInstance()

        imgPothole = findViewById(R.id.imgPothole)
        txtDescription = findViewById(R.id.txtDescription)
        txtTask = findViewById(R.id.txtTask)
        btnCaptureImage = findViewById(R.id.btnCaptureImage)
        btnSubmit = findViewById(R.id.btnSubmit)
        switchDuty = findViewById(R.id.switchDuty)
        imgProfile = findViewById(R.id.imgProfile)

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

        imgProfile.setOnClickListener {
            startActivity(Intent(this, ProfileActivity::class.java))
        }

        val uid = auth.currentUser?.uid
        if (uid == null) {
            Toast.makeText(this, "User not logged in", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        // Duty status
        db.collection("field_staff")
            .document(uid)
            .get()
            .addOnSuccessListener { doc ->
                val isOnDuty = doc.getBoolean("duty_status") ?: false
                switchDuty.isChecked = isOnDuty
                if (isOnDuty) startLocationUpdates()
            }

        switchDuty.setOnCheckedChangeListener { _, isChecked ->
            db.collection("field_staff")
                .document(uid)
                .update("duty_status", isChecked)

            if (isChecked) startLocationUpdates()
            else stopLocationUpdates()
        }

        val mapFragment = supportFragmentManager
            .findFragmentById(R.id.map) as SupportMapFragment
        mapFragment.getMapAsync(this)

        // 🔥 REAL-TIME TASK LISTENER
        listenForTaskUpdates(uid)

        btnCaptureImage.setOnClickListener {
            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {

                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.CAMERA),
                    101
                )
                return@setOnClickListener
            }

            imageUri = createImageUri()
            cameraLauncher.launch(imageUri)
        }

        btnSubmit.setOnClickListener {
            if (selectedImageUri != null && !currentRid.isNullOrEmpty()) {
                captureImage(currentRid!!)
            } else {
                Toast.makeText(this, "Capture image first", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // 🔥 REAL-TIME TASK FUNCTION
    private fun listenForTaskUpdates(uid: String) {

        taskListener = db.collection("field_staff")
            .document(uid)
            .addSnapshotListener { doc, _ ->

                if (doc == null || !doc.exists()) return@addSnapshotListener

                val newRid = doc.getString("assignedTask")

                // Prevent unnecessary reload
                if (newRid == currentRid) return@addSnapshotListener

                if (newRid.isNullOrEmpty()) {
                    currentRid = null

                    txtTask.text = "No Assigned Task"
                    txtDescription.text = "You are currently free."

                    imgPothole.setImageDrawable(null)
                    btnCaptureImage.visibility = View.GONE
                    btnSubmit.visibility = View.GONE

                    if (::mMap.isInitialized) mMap.clear()

                } else {
                    currentRid = newRid

                    txtTask.text = "Task Assigned"

                    btnCaptureImage.visibility = View.VISIBLE
                    btnSubmit.visibility = View.VISIBLE
                    imgPothole.visibility = View.VISIBLE

                    loadReport(newRid)
                }
            }
    }

    // 🔥 LOCATION
    private fun startLocationUpdates() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED) {

            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.ACCESS_FINE_LOCATION), 100)
            return
        }

        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 5000).build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                val location = result.lastLocation ?: return
                updateMapLocation(location.latitude, location.longitude)
                updateLocationToFirestore(location.latitude, location.longitude)
            }
        }

        fusedLocationClient.requestLocationUpdates(request, locationCallback, mainLooper)
    }

    private fun stopLocationUpdates() {
        if (::locationCallback.isInitialized) {
            fusedLocationClient.removeLocationUpdates(locationCallback)
        }
    }

    private fun updateMapLocation(lat: Double, lng: Double) {
        val latLng = LatLng(lat, lng)

        if (workerMarker == null) {
            workerMarker = mMap.addMarker(MarkerOptions().position(latLng).title("You"))
        } else {
            workerMarker!!.position = latLng
        }

        mMap.animateCamera(CameraUpdateFactory.newLatLngZoom(latLng, 15f))
    }

    private fun updateLocationToFirestore(lat: Double, lng: Double) {
        val uid = auth.currentUser?.uid ?: return

        db.collection("field_staff")
            .document(uid)
            .update(
                mapOf(
                    "location" to GeoPoint(lat, lng),
                    "lastUpdated" to System.currentTimeMillis()
                )
            )
    }

    private fun createImageUri(): Uri {
        val file = File(externalCacheDir, "captured_${System.currentTimeMillis()}.jpg")
        return FileProvider.getUriForFile(this, "${packageName}.provider", file)
    }

    private fun loadReport(rid: String) {
        db.collection("pothole_reports")
            .document(rid)
            .get()
            .addOnSuccessListener { report ->
                txtDescription.text = report.getString("description") ?: "No description"
                Glide.with(this).load(report.getString("imageUrl")).into(imgPothole)
            }
    }

    private fun captureImage(rid: String) {
        val storage = FirebaseStorage.getInstance()
        val ref = storage.reference.child("completion_images/$rid.jpg")

        selectedImageUri?.let { uri ->
            ref.putFile(uri)
                .continueWithTask { ref.downloadUrl }
                .addOnSuccessListener { downloadUrl ->
                    updateStatus(rid, downloadUrl.toString())
                }
        }
    }

    private fun updateStatus(rid: String, imageUrl: String) {
        val uid = auth.currentUser?.uid ?: return

        db.collection("pothole_reports")
            .document(rid)
            .update(
                mapOf(
                    "status" to "Pending_Verification",
                    "completionImage" to imageUrl
                )
            )

        db.collection("field_staff")
            .document(uid)
            .update(
                mapOf(
                    "assignedTask" to "",
                    "resolvedCount" to FieldValue.increment(1)
                )
            )

        Toast.makeText(this, "Task Submitted ✅", Toast.LENGTH_SHORT).show()
    }

    override fun onMapReady(googleMap: GoogleMap) {
        mMap = googleMap

        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED) {

            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.ACCESS_FINE_LOCATION), 100)
            return
        }

        mMap.isMyLocationEnabled = true
    }

    override fun onPause() {
        super.onPause()
        stopLocationUpdates()
    }

    override fun onDestroy() {
        super.onDestroy()
        taskListener?.remove()
    }
}