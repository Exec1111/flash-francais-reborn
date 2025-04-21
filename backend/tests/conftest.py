import pytest

@ pytest.fixture(scope='session')
def progression_id_holder():
    return {'id': None}

@ pytest.fixture(scope='session')
def sequence_id_holder():
    return {'id': None}

@ pytest.fixture(scope='session')
def session_id_holder():
    return {'id': None}

@ pytest.fixture(scope='session')
def resource_id_holder():
    return {'id': None}

@ pytest.fixture(scope='session')
def objective_id_holder():
    return {'id': None}

@ pytest.fixture(scope='session')
def progression_id(progression_id_holder):
    return progression_id_holder.get('id')

@ pytest.fixture(scope='session')
def sequence_id(sequence_id_holder):
    return sequence_id_holder.get('id')

@ pytest.fixture(scope='session')
def session_id(session_id_holder):
    return session_id_holder.get('id')

@ pytest.fixture(scope='session')
def resource_id(resource_id_holder):
    return resource_id_holder.get('id')

@ pytest.fixture(scope='session')
def objective_id(objective_id_holder):
    return objective_id_holder.get('id')

@ pytest.fixture(scope='session')
def objective_ids(objective_id_holder):
    val = objective_id_holder.get('id')
    return [val] if val is not None else []
