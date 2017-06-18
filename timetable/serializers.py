from django.forms import model_to_dict
from rest_framework import serializers

from student.models import PersonalTimetable
from timetable.utils import get_tt_rating
from courses.utils import is_waitlist_only
from courses.serializers import get_section_dict, CourseSerializer


def convert_tt_to_dict(timetable):
    """
    Converts @timetable, which is expected to be an instance of PersonalTimetable or SharedTimetable, to a dictionary representation of itself.
    This dictionary representation corresponds to the JSON sent back to the frontend when timetables are generated.
    """
    courses = []
    course_ids = []
    tt_dict = model_to_dict(timetable)

    for section_obj in timetable.sections.all():
        c = section_obj.course  # get the section's course
        c_dict = model_to_dict(c)

        if c.id not in course_ids:  # if not in courses, add to course dictionary with co
            c_dict = model_to_dict(c)
            courses.append(c_dict)
            course_ids.append(c.id)
            courses[-1]['slots'] = []
            courses[-1]['enrolled_sections'] = []
            courses[-1]['textbooks'] = {}
            courses[-1]['is_waitlist_only'] = False

        index = course_ids.index(c.id)
        courses[index]['slots'].extend(
            [dict(get_section_dict(section_obj), **model_to_dict(co)) for co in section_obj.offering_set.all()])
        courses[index]['textbooks'][section_obj.meeting_section] = section_obj.get_textbooks()

        courses[index]['enrolled_sections'].append(section_obj.meeting_section)

    for course_obj in timetable.courses.all():
        if course_obj.id in course_ids:
            index = course_ids.index(course_obj.id)
            courses[index]['is_waitlist_only'] = is_waitlist_only(course_obj, timetable.semester)

    tt_dict['courses'] = courses
    tt_dict['avg_rating'] = get_tt_rating(course_ids)
    if isinstance(timetable, PersonalTimetable):
        tt_dict['events'] = [dict(model_to_dict(event), preview=False)
                             for event in timetable.events.all()]
    return tt_dict


class PersonalTimetableSerializer(serializers.ModelSerializer):
    courses = CourseSerializer(many=True)

    class Meta:
        model = PersonalTimetable
        fields = ('name', 'semester', 'school', 'courses', 'sections', 'events')
