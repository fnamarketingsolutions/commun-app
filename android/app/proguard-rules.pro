# R8 rules for the release build.
#
# Play Console requires at least 25% obfuscation, optimization, and shrinking.
# React Native, Hermes, Reanimated, Firebase, and the Meta SDK already ship
# their own consumer rules. Do not add:
#   -dontobfuscate
#   -dontoptimize
#   -dontshrink
#   -keep class com.facebook.** { *; }
# That last rule also freezes React Native, which is most of this app's DEX.

-keepattributes Signature,InnerClasses,EnclosingMethod,*Annotation*,Exceptions

# JNI entry points.
-keepclasseswithmembernames,includedescriptorclasses class * {
    native <methods>;
}

# react-native-config reads these fields by reflection from JavaScript.
-keep class in.commun.app.BuildConfig { *; }

# Google Play Core & In-App Updates (sp-react-native-in-app-updates)
-keep class com.google.android.play.core.** { *; }
-keep class com.google.android.gms.** { *; }
-keep class com.sudoplz.rninappupdates.** { *; }

