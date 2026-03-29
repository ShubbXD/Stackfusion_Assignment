from rest_framework import serializers

from .models import Booking, ParkingLot, Slot, Vehicle


class ParkingLotSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParkingLot
        fields = "__all__"


class SlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = Slot
        fields = "__all__"


class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = "__all__"


class BookingReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = "__all__"
        depth = 1


class BookingWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ["vehicle", "slot"]
