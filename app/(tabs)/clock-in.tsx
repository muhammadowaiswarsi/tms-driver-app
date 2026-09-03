import React from 'react';
import CheckInOut from '../../src/components/common/CheckInOut';
import DriverLayout from '../../src/components/common/DriverLayout';
import { useAuth } from '../../src/hooks/useAuth';

export default function ClockInScreen() {
  const { authState } = useAuth();
  const { userData } = authState || {};

  return (
    <DriverLayout currentTab="clock-in">
      <CheckInOut embedded userName={userData?.name} />
    </DriverLayout>
  );
}
