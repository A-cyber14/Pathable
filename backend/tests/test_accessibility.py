"""
Unit tests for the accessibility contribution aggregation logic.

decide_updates() is pure (no Firestore access), so these tests don't need
credentials or a live database — they cover the safety rule that makes
contributions safe to apply automatically: a report can only ever fill in
a field that's currently unknown, never silently overwrite a known one.
"""

from services.accessibility import decide_updates


def test_first_report_sets_unknown_field():
    updates, confirmations, conflicts = decide_updates(
        current={"wheelchair_accessible": None},
        reports={"wheelchair_accessible": True},
    )
    assert updates == {"wheelchair_accessible": True}
    assert confirmations == {"wheelchair_accessible": 1}
    assert conflicts == {}


def test_missing_current_field_treated_as_unknown():
    updates, confirmations, conflicts = decide_updates(
        current={},
        reports={"accessible_parking": False},
    )
    assert updates == {"accessible_parking": False}
    assert confirmations == {"accessible_parking": 1}


def test_agreeing_report_reinforces_without_rewriting_field():
    updates, confirmations, conflicts = decide_updates(
        current={"wheelchair_accessible": True},
        reports={"wheelchair_accessible": True},
    )
    assert updates == {}
    assert confirmations == {"wheelchair_accessible": 1}
    assert conflicts == {}


def test_disagreeing_report_never_overwrites_existing_value():
    updates, confirmations, conflicts = decide_updates(
        current={"wheelchair_accessible": True},
        reports={"wheelchair_accessible": False},
    )
    assert updates == {}
    assert confirmations == {}
    assert conflicts == {"wheelchair_accessible": 1}


def test_none_report_is_ignored_even_when_field_known():
    updates, confirmations, conflicts = decide_updates(
        current={"elevator": True},
        reports={"elevator": None},
    )
    assert updates == {} and confirmations == {} and conflicts == {}


def test_field_not_present_in_report_is_untouched():
    updates, confirmations, conflicts = decide_updates(
        current={"auto_doors": None},
        reports={},
    )
    assert updates == {} and confirmations == {} and conflicts == {}


def test_entrance_width_rating_is_categorical_not_boolean():
    updates, confirmations, conflicts = decide_updates(
        current={"entrance_width_rating": None},
        reports={"entrance_width_rating": "wide"},
    )
    assert updates == {"entrance_width_rating": "wide"}

    updates2, confirmations2, conflicts2 = decide_updates(
        current={"entrance_width_rating": "wide"},
        reports={"entrance_width_rating": "narrow"},
    )
    assert updates2 == {}
    assert conflicts2 == {"entrance_width_rating": 1}


def test_multiple_fields_handled_independently_in_one_call():
    updates, confirmations, conflicts = decide_updates(
        current={"wheelchair_accessible": None, "accessible_parking": True, "elevator": True},
        reports={"wheelchair_accessible": True, "accessible_parking": True, "elevator": False},
    )
    assert updates == {"wheelchair_accessible": True}
    assert confirmations == {"wheelchair_accessible": 1, "accessible_parking": 1}
    assert conflicts == {"elevator": 1}


def test_unknown_field_names_outside_allowlist_are_ignored():
    updates, confirmations, conflicts = decide_updates(
        current={},
        reports={"not_a_real_field": True, "doorWidth": 36},
    )
    assert updates == {} and confirmations == {} and conflicts == {}
