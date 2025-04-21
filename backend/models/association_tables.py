from sqlalchemy import Table, Column, Integer, ForeignKey
from database import Base

# Table d'association Many-to-Many entre Sequence et Objective
sequence_objective_association = Table(
    'sequence_objective_association',
    Base.metadata,
    Column('sequence_id', Integer, ForeignKey('sequences.id'), primary_key=True),
    Column('objective_id', Integer, ForeignKey('objectives.id'), primary_key=True)
)

# Table d'association Many-to-Many entre Session et Objective
session_objective_association = Table(
    'session_objective_association',
    Base.metadata,
    Column('session_id', Integer, ForeignKey('sessions.id'), primary_key=True),
    Column('objective_id', Integer, ForeignKey('objectives.id'), primary_key=True)
)

# Table d'association pour lier les séances aux ressources
session_resource_association = Table(
    'session_resource',
    Base.metadata,
    Column('session_id', Integer, ForeignKey('sessions.id'), primary_key=True),
    Column('resource_id', Integer, ForeignKey('resources.id'), primary_key=True)
)

# Table d'association Many-to-Many entre Objective et Resource
objective_resource_association = Table(
    'objective_resource_association',
    Base.metadata,
    Column('objective_id', Integer, ForeignKey('objectives.id'), primary_key=True),
    Column('resource_id', Integer, ForeignKey('resources.id'), primary_key=True)
)

# Table d'association Many-to-Many entre Progression et StudyObject
progression_study_object = Table(
    'progression_study_object',
    Base.metadata,
    Column('progression_id', Integer, ForeignKey('progressions.id', ondelete='CASCADE'), primary_key=True),
    Column('study_object_id', Integer, ForeignKey('study_objects.id', ondelete='CASCADE'), primary_key=True)
)

# Table d'association Many-to-Many entre StudyObject et Resource
study_object_resource = Table(
    'study_object_resource',
    Base.metadata,
    Column('study_object_id', Integer, ForeignKey('study_objects.id', ondelete='CASCADE'), primary_key=True),
    Column('resource_id', Integer, ForeignKey('resources.id', ondelete='CASCADE'), primary_key=True)
)
