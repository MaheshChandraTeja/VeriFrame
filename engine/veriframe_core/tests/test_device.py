from veriframe_core.runtime.device import DeviceInfo


def test_device_info_serializes_without_dict_attribute() -> None:
    device = DeviceInfo(
        selected="cpu",
        cuda_available=False,
        mps_available=False,
        reason="test",
    )

    payload = device.to_dict()

    assert payload == {
        "selected": "cpu",
        "cuda_available": False,
        "mps_available": False,
        "reason": "test",
    }
